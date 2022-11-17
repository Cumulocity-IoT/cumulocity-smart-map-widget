/**
 * Copyright (c) 2020 Software AG, Darmstadt, Germany and/or its licensors
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {
    Component, Input, OnInit, AfterViewInit, OnDestroy, Inject,
    ViewChild, ElementRef, OnChanges, SimpleChanges, Injector, ApplicationRef, ComponentFactoryResolver, ViewEncapsulation, ComponentRef
} from '@angular/core';
import { ResizedEvent } from 'angular-resize-event';
import { INIT_COORDS, C8Y_DEVICE_GROUP, C8Y_DEVICE_SUBGROUP } from '../common/tokens';
import { InventoryBinaryService, InventoryService, IManagedObject, EventService, Realtime } from '@c8y/client';
import { isDevMode } from '@angular/core';
import { Commonc8yService } from '../common/c8y/commonc8y.service';
import * as moment_ from 'moment';
import { InitCordInterface } from '../common/interfaces/initCord.interface';
declare global {
    interface Window {
        L: any;
        h337: any;
    }
}

import 'leaflet2/dist/leaflet.js';
const L: any = window.L;
import 'leaflet-extra-markers/dist/js/leaflet.extra-markers.js';
import 'leaflet.markercluster/dist/leaflet.markercluster';

import { DeviceMatrix } from '../common/interfaces/devicesMatrix.interface';
import { TagsEventsMatrix } from '../common/interfaces/tagsEventsMatrix.interface';
import { MovingMarkerService } from '../common/movingMarker.service';
import { HeatLayerService } from '../common/heatLayer.service';
import { ImageRotateService } from '../common/imageRotate.service';
import { Subject } from 'rxjs';
import { GPSmartMapPopupComponent } from './gp-smart-map-popup.component';
const groupArray = require('group-array');
const moment = moment_;
const isAppBuilderMode = true; // switch between AppBuilder and angular App
@Component({
    // tslint:disable-next-line: component-selector
    selector: 'lib-gp-smart-map',
    templateUrl: './gp-smart-map.component.html',
    styleUrls: ['./gp-smart-map.component.css'],
    encapsulation: ViewEncapsulation.None
})
export class GPSmartMapComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
    @Input() set config(newConfig: any) {
        this._config = newConfig;
        if (isDevMode()) { console.log('+++--- config changed via set... ', this._config); }
        if (this.map) { this.reloadMap(false); }
    }
    get config(): any {
        return this._config;
    }
    deviceId = '';
    beaconGroupId = '';
    beaconPingDuration = 30; // 30 seconds default
    isBeaconActive = null;
    isIndoor = false;
    followDevice = true;
    mapType = 'OutDoor';
    isInitialDeviceRender = false;
    deviceTagId = '';
    GPSTrackerId = '';
    isGeofence = false;
    isHeatMap = false;
    isClusterMap = false;
    loadChildDevices = true;
    isMarkerIconFromAssetType = false;
    markerIcon = '';
    iconColor = '';
    markerColor ='';
    markerShape = '';
    hierarchyLevel = 0;
    shapeColorField = '';
	markerColorField = '';
	iconColorField = '';
    heatMapDeviceEventID = [];
    locationEventType = 'c8y_LocationUpdate';
    heatMapQuantity = '';
    heatMapRealtimeData = [];
    heatMapRealTimeLastEventData = [];
    heatMapRealtimeEventCounter = 0;
    heatIntensityPerEvent = 1;
    isLastEventHeatmap = true;
    heatMapLegendLow = 'Low';
    heatMapLegendMedium = 'Medium';
    heatMapLegendHigh = 'High';
    fromDate = '';
    toDate = '';
    currentDate = new Date();
    minCurrentDate = null;
    minToDate = null;
    measurementList = [];
    rootLong = 0;
    rootLat = 0;
    floorPlanData = [];
    floorFragmentTypes = '';
    selectedMarkerToggleValue = 'All';
    floorZoom = 20;
    isAutoIndoorZoom = true;
    initialMinZoom = 3;
    initialMaxZoom = 14;
    intervalObj = null;
    eventIntervalObj = null;
    allDeviceList = [];
    devicesToGetChildList = [];
    activeFloor = 0;
    devicesMatrix = [];
    tagEventMatrix = [];
    indoorImageBounds = [];
    imageOverlayList = [];
    imgOverlayCollection = null;
    geoJSONStyle = {
        color: '#8e9190',
        opacity: 1,
        weight: 2,
    };
    appId = null;
    mapResize$: Subject<any> = new Subject<any>();
    popupDetailCompRef: ComponentRef<GPSmartMapPopupComponent> = null;
    dashboardField = null;
    tabGroupField = null;
    configDashboardList = [];

    // tslint:disable-next-line: variable-name
    constructor(@Inject(INIT_COORDS) protected _initCoords: InitCordInterface,
                private invBinSvc: InventoryBinaryService, private invSvc: InventoryService,
                private events: EventService, private cmonSvc: Commonc8yService,
                private movingMarkerService: MovingMarkerService,
                private heatLayerService: HeatLayerService,
                private rotateImageService: ImageRotateService,
                private realTimeService: Realtime, private appRef: ApplicationRef, private injector: Injector,
                private resolver: ComponentFactoryResolver) {
        if (isDevMode()) { console.log('+-+- constructing map'); }
        // Leaflet Map Event Handlers
        this.onClickHandler = (evt: any) => this.__doClickOnMap(evt);
        this.onLayerChangeHandler = (evt: any) => this.__doSwitchLayer(evt);
        this.onOverlaySelectHandler = (evt: any) => this.__doSelectOverlay(evt);
        this.width = 600;
        this.height = 200;

        // Heatmap date filter validation
        this.minCurrentDate = new Date();
        this.minCurrentDate.setDate(this.currentDate.getDate() - 1);
    }
    protected isContentOpen = false;
    // dimensions of the current window
    width: number;
    height: number;
    // tslint:disable-next-line: variable-name
    private _config: any = {};
    // right now only this layer is used as base layer for map... could be extended to support other base layers...
    LAYER_OSM = {
        id: 'openstreetmap',
        name: 'Open Street Map',
        enabled: true,
        layer: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxNativeZoom: 19, // max zoom where base layer tiles will be retrieved... this avoids errors when zooming more
            maxZoom: 28, // but, it can be zoomed closer :)
            attribution: 'Open Street Map'
        })
    };
    private baseLayerGroup = L.layerGroup([]);
    private heatLayer: any = null;
    private allMarkers: any = {};
    private allGoefences: any = [];
    private allHeatMap: any = [];
    private allSubscriptions: any = [];
    private layerControl = L.control.layers([], [], {
        hideSingleBase: true, sortLayers: true,
        sortFunction(a, b) {
            return (a.options && b.options ? (a.options.name - b.options.name) : '');
        }
    });
    private featureGroup = [];
    private defaultBounds;
    protected map: any;                            // Map reference (currently leaflet)
    protected mapLoaded = false;                   // True if the map has been loaded
    // html elements to contain the map and define sizes
    @ViewChild('elfloormap', { static: true}) protected mapDivRef: ElementRef;
    @ViewChild('prefloormap', { static: true }) protected mapInfosDivRef: ElementRef;
    protected mapDiv: HTMLDivElement;
    protected mapInfosDiv: HTMLDivElement;
    // event handlers
    protected onClickHandler: any;
    protected onLayerChangeHandler: any;
    protected onOverlaySelectHandler: any;
    realtime = true;
    isDraggable = false;
    isBusy = false;
    ngOnInit() {
        this.appId = this.cmonSvc.getAppId();
        this.reloadMap(true);
    }
    refresh() {
        this.reloadMap(false);
    }
    private reloadMap(isFirstCall) {
        if (isDevMode() && !isAppBuilderMode) {
            this.deviceId = '8200'; // '1606'; // '592216'; // '78205'; // '3300'; // '25796'; // '261760'; // '914357';
            this.beaconGroupId = ''; // '25799'; // '3949';
            this.rootLong = 0; // 8.637085;
            this.rootLat = 0; // 49.814334;
            this.floorFragmentTypes = 'RetailMart'; // 'Car-Production-Plant'; // 'Smart-Office'; // 'GoodsTransport'; // 'Demo-001'; // '';
            this.GPSTrackerId = ''; // '';
            this.deviceTagId = ''; // '16015';
            this.isIndoor = false;
            this.selectedMarkerToggleValue = 'All';
            this.measurementList = [];
            this.followDevice = false;
            this.locationEventType = 'c8y_LocationUpdate,s7y_BeaconLocationUpdate';
            this.isGeofence = false;
            this.isHeatMap = false;
            this.heatMapQuantity = '';
            this.mapType = 'ClusterMap';
            this.loadChildDevices = false;
            this.dashboardField = 'dashboardId';
            this.isLastEventHeatmap = false;
            this.isMarkerIconFromAssetType = true;
            this.markerIcon = 'question';
            this.iconColor = '#000000';
            this.markerColor ='#ff801f';
            this.markerShape = 'star';
            this.hierarchyLevel = 2;
            this.configDashboardList = [];
            this.shapeColorField = 'smartMapShape';
		    this.markerColorField = 'smartMapMarkerColor';
		    this.iconColorField = 'smartMapIconColor';
        }
        if (isAppBuilderMode) {
            this.beaconGroupId = this._config.beaconGroupId;
            if (this.config.device) {
                this.deviceId = this._config.device.id;
            }
            this.rootLong = this._config.rootLong;
            this.rootLat = this._config.rootLat;
            this.measurementList = this._config.measurementList;
            this.floorFragmentTypes = this._config.floorFragmentTypes;
            this.GPSTrackerId = this._config.GPSTrackerId;
            this.deviceTagId = this._config.deviceTagId;
            this.selectedMarkerToggleValue = this._config.selectedMarkerToggleValue;

            this.isGeofence = this._config.isGeofence;
            this.isHeatMap = this._config.isHeatMap;
            this.isIndoor = this._config.isIndoor;
            this.dashboardField = this._config.dashboardField;
            this.tabGroupField = this._config.tabGroupField;
            this.heatMapQuantity = this._config.heatMapQuantity;
            this.followDevice = this._config.followDevice;
            this.mapType = this._config.mapType;
            this.configDashboardList =  this._config.dashboardList;

            if (this._config.locationEventType) {
                this.locationEventType = this._config.locationEventType;
            }
            if (this._config.isIndoorAutoZoom !== null && this._config.isIndoorAutoZoom !== undefined) {
                this.isAutoIndoorZoom = this._config.isIndoorAutoZoom;
            }
            if (this._config.outdoorZoom !== null && this._config.outdoorZoom !== undefined) {
                this.initialMaxZoom = this._config.outdoorZoom;
            }
            if (this._config.indoorZoom !== null && this._config.indoorZoom !== undefined) {
                this.floorZoom = this._config.indoorZoom;
            }
            if (this._config.loadChildDevices !== null && this._config.loadChildDevices !== undefined) {
                this.loadChildDevices = this._config.loadChildDevices;
            }
            if (this._config.isHeatmapAutoIntensity !== null && this._config.isHeatmapAutoIntensity !== undefined) {
                this.heatIntensityPerEvent = this._config.heatIntensityPerEvent;
            }
            if (this._config.isLastEventHeatmap !== null && this._config.isLastEventHeatmap !== undefined) {
                this.isLastEventHeatmap = this._config.isLastEventHeatmap;
            }
            if (this._config.heatMapLegendLow !== null && this._config.heatMapLegendLow !== undefined) {
                this.heatMapLegendLow = this._config.heatMapLegendLow;
            }
            if (this._config.heatMapLegendMedium !== null && this._config.heatMapLegendMedium !== undefined) {
                this.heatMapLegendMedium = this._config.heatMapLegendMedium;
            }
            if (this._config.heatMapLegendHigh !== null && this._config.heatMapLegendHigh !== undefined) {
                this.heatMapLegendHigh = this._config.heatMapLegendHigh;
            }
            if (this._config.isMarkerIconFromAssetType !== null && this._config.isMarkerIconFromAssetType !== undefined) {
                this.isMarkerIconFromAssetType = this._config.isMarkerIconFromAssetType;
            }
            if (this._config.markerIcon !== null && this._config.markerIcon !== undefined) {
                this.markerIcon = this._config.markerIcon;
            }
            if (this._config.iconColor !== null && this._config.iconColor !== undefined) {
                this.iconColor = this._config.iconColor;
            }
            if (this._config.markerColor !== null && this._config.markerColor !== undefined) {
                this.markerColor = this._config.markerColor;
            }
            if (this._config.markerShape !== null && this._config.markerShape !== undefined) {
                this.markerShape = this._config.markerShape;
            }
            if (this._config.hierarchyLevel !== null && this._config.hierarchyLevel !== undefined) {
                this.hierarchyLevel = parseInt(this._config.hierarchyLevel);
            }
            if (this._config.shapeColorField !== null && this._config.shapeColorField !== undefined) {
                this.shapeColorField = this._config.shapeColorField;
            }
            if (this._config.markerColorField !== null && this._config.markerColorField !== undefined) {
                this.markerColorField = this._config.markerColorField;
            }
            if (this._config.markerColorField !== null && this._config.markerColorField !== undefined) {
                this.markerColorField = this._config.markerColorField;
            }

        }

        // setup map options based on map type
        switch (this.mapType) {
            case 'InDoor':
                this.isIndoor = true;
                break;
            case 'Hybrid':
                this.isIndoor = false;
                this.isHeatMap = false;
                break;
            case 'HeatMap':
                this.isHeatMap = true;
                this.isIndoor = false;
                break;
            case 'InDoorHeatMap':
                this.isHeatMap = true;
                this.isIndoor = true;
                break;
            case 'ClusterMap':
                this.isIndoor = false;
                this.isClusterMap = true;
                break;
            case 'InDoorClusterMap':
                this.isIndoor = true;
                this.isClusterMap = true;
                break;
            default:
                break;
        }

        // initialize the device or group selected...
        this.mapDiv = this.mapDivRef.nativeElement;
        this.mapInfosDiv = this.mapInfosDivRef.nativeElement;
        this.__initializeMap();
        this.initializeAndLoadMap(isFirstCall);
    }
    /**
     * Initialize and load map whenever user refresh the page or reload browser
     */
    private initializeAndLoadMap(isFirstCall) {
        if (!isFirstCall) { this.clearMapAndSubscriptions(); }
        if (isDevMode()) { console.log('selectedMarkerToggleValue... ', this.selectedMarkerToggleValue); }
        this.isBusy = true;
        if (!this.isIndoor) { this.__doRenderMap(null); }
        if (this.floorFragmentTypes && this.floorFragmentTypes !== '') {
            this.__doRenderFloorPlans();
        } else {
            if (this.isHeatMap) {
                if(!isFirstCall) {this.heatLayer.addTo(this.map);}
                this.renderDevicesForHeatMapEvents(this.deviceId);
                this.isBusy = false;
            } else {
                this.renderDevicesAndEvents();
            }
        }
    }

    /**
     * Render Devices and events based infra option selection in configuration
     */
    private renderDevicesAndEvents() {
        if (this.selectedMarkerToggleValue === 'Beacons') {
            this.__doRenderAllDevicesForGroup({ id: this.beaconGroupId, level: 0}, -1, -1, true);
        } else {
            this.__doRenderAllDevicesForGroup({ id: this.deviceId, level: 0}, -1, -1, false);
        }
        if (this.isGeofence) {
            this.__doRenderGeofencesOnMap();
        }
        this.fetchTagEvents();
    }

    public ngAfterViewInit(): void {
        if (isDevMode()) { console.log('+-+- after view init map'); }
        if (!this.isIndoor) {
           this.__initMapHandlers();
       }
        this.rotateImageService.initialize(L);
    }

    // For development purpose only
    ngOnChanges(changes: SimpleChanges): void {
        if (changes) {
            if (isDevMode()) { console.log('+-+- changes detected... ', changes); }
        } else {
            if (isDevMode()) { console.log('+-+- NO changes detected... '); }
        }
    }

    /**
     * Clear map, all variables and subscriptions
     */
    private clearMapAndSubscriptions() {
        if (isDevMode()) { console.log('+-+- DESTROYING... ', this.allSubscriptions); }
        this.map.off('click', this.onClickHandler);
        this.map.remove();
        this.allMarkers = {};
        this.isBeaconActive = null;
        this.indoorImageBounds = [];
        this.layerControl = L.control.layers([], [], {
            hideSingleBase: false, sortLayers: true,
            sortFunction(a, b) {
                return a.options.name - b.options.name;
            }
        });

        this.featureGroup = [];
        this.allDeviceList = [];
        this.devicesToGetChildList = [];
        this.devicesMatrix = [];
        this.tagEventMatrix = [];
        this.clearSubscriptions();
        if (this.intervalObj) {
            clearInterval(this.intervalObj);
            this.intervalObj = null;
        }
        if (this.eventIntervalObj) {
            clearInterval(this.eventIntervalObj);
            this.eventIntervalObj = null;
        }
        this.allGoefences.forEach(gfOnLvl => {
            this.layerControl.removeLayer(gfOnLvl.layer);
            this.map.removeLayer(gfOnLvl.layer);
        });
        this.allHeatMap = [];
        this.heatMapRealtimeData = [];
        this.heatMapRealTimeLastEventData = [];
        this.heatMapRealtimeEventCounter = 0;
        this.heatMapDeviceEventID = [];
        if (this.heatLayer) { this.heatLayer.setLatLngs([]); }
        this.allGoefences = [];
    }

    /**
     * Clear all Realtime subscriptions
     */
    private clearSubscriptions() {
        if (this.allSubscriptions) {
            this.allSubscriptions.forEach((s) => {
                if (isDevMode()) { console.log('+-+- UNSUBSCRIBING FOR ', s.id); }
                this.realTimeService.unsubscribe(s.subs);
                /* if (s.type  === 'Events') {
                    this.realTimeService.unsubscribe(s.subs);
                } else {
                    s.subs.unsubscribe();
                } */
            });
        }
    }

    public ngOnDestroy(): void {
        this.clearMapAndSubscriptions();
    }

    protected __initializeMap(): void {
        if (this.mapLoaded) {
            return;
        }
        this.mapLoaded = true;
        this.__updateMapSize(null, null);
    }

    /**
     * Lock background as White for Indoor only Map
     */
    private lockIndoorMapBG() {
        const leafletLayer = document.querySelector('.leaflet-layer') as any;
        const leafletContainer = document.querySelector('.leaflet-container') as any;
        leafletContainer.style.background = '#fff';
        leafletLayer.style.display = 'none';
    }

    /**
     * Render the map (establish center and base layer)
     */
    protected __doRenderMap(mapBound): void {
        // Create Leaflet Map in fixed DIV - zoom level is hardcoded for simplicity and will be overriden with fitBounds
        const initBounds = this.__initMapBounds(mapBound);
        if (this.isIndoor) {
            this.map = L.map(this.mapDiv, {
                zoomControl: true,
                zoomAnimation: false,
                trackResize: true,
                boxZoom: true,
                minZoom: 10,
                zoomDelta: 0.25,
                zoomSnap: 0
            }).setView([initBounds.getCenter().lat, initBounds.getCenter().lng], this.floorZoom);
            this.map.setMaxBounds(initBounds);
            if (this.isAutoIndoorZoom) { this.map.fitBounds(initBounds); } // default fit bound

            // Force Restriction for Indoor Map
            setTimeout(() => {
                this.lockIndoorMapBG();
            }, 50);
        } else {
            this.map = L.map(this.mapDiv, {
                zoomControl: true,
                zoomAnimation: false,
                trackResize: true,
                boxZoom: true,
            }).setView([initBounds.getCenter().lat, initBounds.getCenter().lng], this.initialMinZoom);
        }
        this.map.addLayer(this.LAYER_OSM.layer);
    }
    protected __doRenderAllDevicesForGroup(record: any, deviceLevel: number, recordCounter: number, isBeacon: boolean): void {
        let deviceList: any = null;
        const t0 = performance.now();
        recordCounter++;
        if (isDevMode()) { console.log('+-+- BEFORE CALL ', t0); }
        if (record?.id) {// this.config.device
            this.cmonSvc.getTargetObject(record.id) // this.config.device.id
                .then((mo) => {
                    if (!isBeacon) { deviceLevel++; }
                    if (mo && deviceLevel == 0  && !mo.c8y_IsDevice) {
                        if (record.level !== 0) { this.filterBySelectedType(mo); };
                        if(record.level === 0 || record.level < this.hierarchyLevel) {
                        // GET child devices
                            this.cmonSvc.getChildDevices(record.id, 1, this.selectedMarkerToggleValue, deviceList) // this.config.device.id
                            .then((deviceFound) => {
                                deviceList = deviceFound.data;
                                this.allDeviceList.push.apply(this.allDeviceList, deviceList);
                                if (record.level < this.hierarchyLevel) {
                                    deviceList.forEach(element => {
                                        this.updateDeviceMatrix(element.id, record.id, isBeacon, false);
                                        if (deviceLevel <= this.hierarchyLevel  && (this.loadChildDevices || ( !this.loadChildDevices && deviceLevel >= 0)  || this.mapType === 'Hybrid')) {
                                            this.updateChildDeviceList(element, ++record.level );
                                        }
                                    });
                                }
                               
                                if (isDevMode()) { console.log('+-+- CHILD DEVICES FOUND ', this.allDeviceList); }
                                if (this.selectedMarkerToggleValue === 'Beacons' ||
                                    (!isBeacon && (recordCounter > this.devicesToGetChildList.length ||  this.devicesToGetChildList.length == 0))) {
                                    this.addDevicesToMap(this.allDeviceList, this.map, this.defaultBounds, null);
                                } else if (isBeacon) {
                                    this.__doRenderAllDevicesForGroup({ id: record.id, level: 0}, -1, -1, false);
                                } else {
                                    this.__doRenderAllDevicesForGroup(this.devicesToGetChildList[recordCounter], deviceLevel,recordCounter, false);
                                }
                            })
                            .catch((err) => {
                                if (isDevMode()) { console.log('+-+- ERROR FOUND WHILE GETTING CHILD DEVICES... ', err); }
                                const t1 = performance.now();
                                if (isDevMode()) { console.log('+-+- AFTER GET CHILD DEVICES CALL ', (t1 - t0)); }
                            });
                        }
                    } else {
                        this.updateDeviceMatrix(mo.id, record.id, isBeacon, false);
                        if (record.level <= this.hierarchyLevel && (this.loadChildDevices ||  ( !this.loadChildDevices && deviceLevel >= 0) || this.mapType === 'Hybrid')) {
                            this.updateChildDeviceList(mo, ++record.level);
                        }
                        this.filterBySelectedType(mo);
                        if (isDevMode()) { console.log('+-+- CHILD DEVICES FOUND ', this.allDeviceList); }
                        if (this.selectedMarkerToggleValue === 'Beacons' ||
                            (!isBeacon && recordCounter >= this.devicesToGetChildList.length)) {
                            this.addDevicesToMap(this.allDeviceList, this.map, this.defaultBounds, null);
                        } else if (isBeacon) {
                            this.__doRenderAllDevicesForGroup({ id: record.id, level: 0}, -1, -1, false);
                        } else {
                            this.__doRenderAllDevicesForGroup(this.devicesToGetChildList[recordCounter], deviceLevel, recordCounter, false);
                        }
                    }
                })
                .catch((err) => {
                    if (isDevMode()) { console.log('+-+- ERROR while getting context object details for dashboard ', err); }
                });
        } else {
            if (this.selectedMarkerToggleValue !== 'Beacons' && this.deviceId) {
                this.__doRenderAllDevicesForGroup({ id: record.id, level: 0}, -1, -1,  false);
            } else if (this.selectedMarkerToggleValue !== 'Beacons' && this.allDeviceList.length > 0) {
                this.addDevicesToMap(this.allDeviceList, this.map, this.defaultBounds, null);
            } else {
                this.addLayerToMap(this.map, this.defaultBounds, null);
            }
        }
    }

     /** filter devices/assets based on user selection */
    private filterBySelectedType(mo: any) {
        if((this.selectedMarkerToggleValue === 'Assets' &&  mo.c8y_IsAsset) ||
        (this.selectedMarkerToggleValue === 'Devices' && mo.c8y_IsDevice) ||
        (this.selectedMarkerToggleValue !== 'Devices' && this.selectedMarkerToggleValue !== 'Assets' ) ) {
            this.allDeviceList.push(mo);
        } 
    }
    /** Update child deviceList  */
    private updateChildDeviceList(element: any, level:number) {
        if (element.childDevices && element.childDevices.references) {
          const childDevices = element.childDevices.references;
          childDevices.forEach(childObj => {
            this.devicesToGetChildList.push({
              id: childObj.managedObject.id,
              level: level
            });
            this.updateDeviceMatrix(childObj.managedObject.id, element.id, false, true);
            
          });
        }
        if (element.childAssets && element.childAssets.references) {
          const childAssets = element.childAssets.references;
          childAssets.forEach(childObj => {
            this.devicesToGetChildList.push({
              id: childObj.managedObject.id,
              level: level
            });
            this.updateDeviceMatrix(childObj.managedObject.id, element.id, false, true);
            
          });
        }
      }
    

    /**
     * Check if current device is a beacon type or not
     */
    private checkIsBeacon(deviceId) {
        const deviceObj = this.devicesMatrix.find(device => (device.deviceId === deviceId && device.type === 'Beacon'));
        if (deviceObj) { return true; }
        return false;
    }

    /**
     * Check if current device has child devices or not
     */
    private hasChildDevice(deviceId) {
        const deviceObj = this.devicesMatrix.find(device => (device.parentDeviceId === deviceId && device.type !== 'Default'));
        if (deviceObj) { return true; }
        return false;
    }

    /**
     * Check if current device is active for tracking
     */
    private isActiveDevice(deviceId) {

        const deviceObj = this.devicesMatrix.find(device => (device.deviceId === deviceId && device.isActive));
        if (deviceObj || this.devicesMatrix.length == 0) { return true; }
        return false;
    }

    /**
     * Activate indoor device on map. Applicable for hybrid map
     */
    private activateIndoorDeviceOnMap(deviceId) {
        let parentId = null;
        let data = null;
        this.devicesMatrix.forEach(device => {
            if (device.deviceId === deviceId) {
                device.isActive = true;
                parentId = device.parentDeviceId;
                data = device.deviceData;
            }
        });
        this.devicesMatrix.forEach(device => {
            if ((device.parentDeviceId === parentId || device.deviceId === parentId)
                && device.type !== 'InDoor') {
                device.isActive = false;
            }
        });
        return data;
    }

    /**
     * Check if current device has child outdoor device. Applicable for Hybrid Map.
     */
    private hasChildOutDoorDevice(deviceId) {
        const deviceObj = this.devicesMatrix.find(device => (device.parentDeviceId === deviceId && device.type === 'OutDoor'));
        if (deviceObj) { return true; }
        return false;
    }

    /**
     * Activate outdoor device on map. Applicable for hybrid map
     */
    private activateOutdoorDeviceOnMap(tagDeviceId) {
        let parentId = null;
        let data = null;
        this.devicesMatrix.forEach(device => {
            if (device.deviceId === tagDeviceId) {
                device.isActive = false;
                parentId = device.parentDeviceId;
            }
        });
        this.devicesMatrix.forEach(device => {
            if ((device.parentDeviceId === parentId && device.type === 'OutDoor') ||
                (device.deviceId === parentId && !this.hasChildOutDoorDevice(parentId))) {
                device.isActive = true;
                data = device.deviceData;
            }
        });
        return data;
    }

    /**
     * This method will return device object for active device
     */
    private getCurrentActiveDeviceId(newDeviceId, newDeviceType) {
        let parentId = null;
        let data = null;
        this.devicesMatrix.forEach(device => {
            if (device.deviceId === newDeviceId) {
                parentId = device.parentDeviceId;
            }
        });
        this.devicesMatrix.forEach(device => {
            if ((device.parentDeviceId === parentId && device.type !== newDeviceType) ||
                (device.deviceId === parentId && !this.hasChildOutDoorDevice(parentId))) {
                data = device.deviceData;
            }
        });
        if (data) {
            return data.id;
        }
        return null;
    }

    /**
     * Return Parent device managed object for given child device
     */
    private getParentDeviceData(deviceId) {
        let data = null;
        this.devicesMatrix.forEach(device => {
            if (device.deviceId === deviceId && (device.type === 'OutDoor' || device.type === 'InDoor' || device.isChild)) {
                const dataObj = this.devicesMatrix.filter(deviceObj => deviceObj.deviceId === device.parentDeviceId)[0];
                data = (dataObj ? dataObj.deviceData : null);
            }
        });
        return data;
    }

    /**
     * Update device matrix for managing device managed object
     */
    private updateDeviceData(data) {
        this.devicesMatrix.forEach(device => {
            if (device.deviceId === data.id) {
                device.deviceData = data;
            }
        });
    }

    /**
     * Activated default device on map. Applicable on Hybrid map
     */
    private defaultActivateDevices() {
        this.devicesMatrix.forEach(device => {
            if (!this.checkIsBeacon(device.deviceId) && !this.hasChildDevice(device.deviceId) && device.type !== 'InDoor') {
                device.isActive = true;
            } else {
                device.isActive = false;
            }
        });
    }

    /**
     * Update device matrix for different types of devices
     */
    private updateDeviceMatrix(deviceId, deviceParentId, isBeacon, isChildDevice) {
        const deviceObj = this.devicesMatrix.find(device => (device.deviceId === deviceId));
        if (!deviceObj) {
            const deviceMatrix: DeviceMatrix = {};
            deviceMatrix.deviceId = deviceId;
            deviceMatrix.isChild = isChildDevice;
            if (isBeacon) {
                deviceMatrix.type = 'Beacon';
            } else if (this.deviceTagId && this.deviceTagId.includes(deviceId)) {
                deviceMatrix.type = 'InDoor';
            } else if (this.GPSTrackerId && this.GPSTrackerId.includes(deviceId)) {
                deviceMatrix.type = 'OutDoor';
            } else {
                deviceMatrix.type = 'Default';
            }
            deviceMatrix.parentDeviceId = deviceParentId;
            this.devicesMatrix.push(deviceMatrix);
        }
    }

    /**
     * This method used to update location change time in device matrix for each devices at runtime
     * THis will help to decide which child device to display on map when there is one or more child devices for a parent asset
     * Not Applicable for Hybrid map
     */
    private updateLocationChangeTime(deviceData: any) {
        if (this.loadChildDevices && this.mapType !== 'Hybrid') {
            const activeDevice = this.devicesMatrix.find((device) => device.deviceId === deviceData.id);
            const existingDevicePos = (activeDevice.deviceData && activeDevice.deviceData.c8y_Position ?
                activeDevice.deviceData.c8y_Position : null);
            const currentDevicePos = (deviceData && deviceData.c8y_Position ?
                deviceData.c8y_Position : null);
            if (existingDevicePos && currentDevicePos && (existingDevicePos.lat !== currentDevicePos.lat ||
                existingDevicePos.lng !== currentDevicePos.lng || existingDevicePos.alt !== currentDevicePos.alt)) {
                activeDevice.deviceData.c8y_Position = deviceData.c8y_Position;
                activeDevice.locationChangeTime = new Date().getTime();
                if (isDevMode()) { console.log('device matrix location updated...'); }
                const markers = L.markerClusterGroup();
                if (activeDevice.isChild) {
                    const parentDevice = this.devicesMatrix.find((device) => device.deviceId === activeDevice.parentDeviceId);
                    if (parentDevice) {
                        this.showHideDevicesOnMap(parentDevice);
                    }
                }
            }
        }
    }

    /**
     * This method used to update location change time for all devices when page is loaded/refreshed
     * THis will help to decide which child device to display on map when there is one or more child devices for a parent asset
     * Not Applicable for Hybrid map
     */
    private getChildLocationEventAndUpdateTime() {
        return new Promise<void>(
            (resolve, reject) => {
                if (this.loadChildDevices && this.mapType !== 'Hybrid') {
                    const deviceEventType = this.locationEventType.split(',').map(value => value.trim());
                    const now = moment();
                    const promArr = new Array<Promise<any>>();
                    this.devicesMatrix.forEach((device) => {
                        // tslint:disable-next-line: deprecation
                        if (!device.isChild) {
                            const eventListData = null;
                            promArr.push(this.cmonSvc.getEventList(50, 1, eventListData, device.deviceId, deviceEventType,
                                '1970-01-01', now.add(1, 'days').format('YYYY-MM-DDTHH:mm:ssZ'), 50, true));
                        }
                    });
                    Promise.all(promArr).then((eventList) => {
                        eventList.forEach((eventListData) => {
                            const eventData = eventListData.data;
                            if (eventData && eventData.length > 0) {
                                const eventFilterList = eventData.filter((event) => this.locationEventType.includes(event.type));
                                eventFilterList.forEach(eventElement => {
                                    if (eventElement.source && eventElement.source.id ) {
                                        const eventDeviceId = eventElement.source.id;
                                        const device = this.devicesMatrix.find((deviceObj) => deviceObj.deviceId === eventDeviceId);
                                        if (device && device.locationChangeTime === undefined) {
                                            device.locationChangeTime = new Date(Date.parse(eventData[0].creationTime)).getTime();
                                        }
                                    }
                                });
                            }
                        });
                        const parentDevices = this.devicesMatrix.filter((device) => !device.isChild);
                        parentDevices.forEach((parentDevice) => {
                            this.showHideDevicesOnMap(parentDevice);
                        });
                        resolve();
                    });
                } else {
                    resolve();
                }
        });
    }

    /**
     * Show/Hide devices on map based on location change time for child devices
     */
    private showHideDevicesOnMap(parentDevice) {
            const childDevices = this.devicesMatrix.filter((device) => device.parentDeviceId === parentDevice.deviceId && device.isChild);
            let lastActiveDevice = parentDevice;
            let lastActiveDeviceTimeStamp = (parentDevice.locationChangeTime ? parentDevice.locationChangeTime : 0);
            if (childDevices.length > 0) {
                childDevices.forEach((childDevice) => {
                    if (childDevice.locationChangeTime && lastActiveDeviceTimeStamp <= childDevice.locationChangeTime) {
                        lastActiveDeviceTimeStamp = childDevice.locationChangeTime;
                        this.hideDeviceOnMap(lastActiveDevice.deviceId);
                        lastActiveDevice = childDevice;
                    } else {
                        this.hideDeviceOnMap(childDevice.deviceId);
                    }
               });
                const marker = this.allMarkers[lastActiveDevice.deviceId];
                if (marker) {
                    const fgOnLvl = this.featureGroup.find(fg => fg.name === marker.options.floor);
                    if (this.isClusterMap) {
                        const clusterLayer = fgOnLvl.layer.getLayers();
                        if (clusterLayer && clusterLayer.length > 0) {
                            for (const layer of clusterLayer) {
                                if (layer._url === undefined) {
                                    layer.addLayer(marker);
                                    break;
                                }
                            }
                        }
                    }  else {
                       fgOnLvl.layer.addLayer(marker);
                    }
                }
                if (lastActiveDevice.deviceId !== parentDevice.deviceId) {
                    this.hideDeviceOnMap(parentDevice.deviceId);
                }
           }
    }
    private hideDeviceOnMap(deviceId) {
        const cMarker = this.allMarkers[deviceId];
        if (cMarker) {
            const oldFeatureGroup = this.featureGroup.find(fg => fg.name === cMarker.options.floor);
            if (this.isClusterMap) {
                const clusterLayer = oldFeatureGroup.layer.getLayers();
                if (clusterLayer && clusterLayer.length > 0) {
                    clusterLayer.forEach(layer => {
                        if (layer._url === undefined) {
                            layer.removeLayer(cMarker);
                        }
                    });
                }
            } else {
                oldFeatureGroup.layer.removeLayer(cMarker); // marker removed from feature group
            }
        }
    }
    private hideInfraOnMap() {
        const infraDeviceList = this.devicesMatrix.filter((device) => device.type === 'Beacon');
        infraDeviceList.forEach((device) => {
            const marker = this.allMarkers[device.deviceId];
            if (marker) {
                const oldFeatureGroup = this.featureGroup.find(fg => fg.name === marker.options.floor);
                oldFeatureGroup.layer.removeLayer(marker); // marker removed from feature group
            }
        });
    }
    private showInfraOnMap() {
        const infraDeviceList = this.devicesMatrix.filter((device) => device.type === 'Beacon');
        infraDeviceList.forEach((device) => {
            const marker = this.allMarkers[device.deviceId];
            if (marker) {
                const fgOnLvl = this.featureGroup.find(fg => fg.name === marker.options.floor);
                fgOnLvl.layer.addLayer(marker);
            }
        });
    }

    /**
     * render single device on map based on its position
     */
    private addSingleDeviceToMap(device: any, themap, mapBounds, maxZoom?: number, isSwitch?: boolean): void {
        /* const realtimeOps = {
            realtime: true,
            realtimeAction: RealtimeAction.UPDATE
        }; */
        const isBeacon = this.checkIsBeacon(device.id);
        if (device && device.c8y_Position && device.c8y_Position.lat && device.c8y_Position.lng
            && (isSwitch || (isBeacon || !this.hasChildDevice(device.id) && this.isActiveDevice(device.id)))) {
            
            
            // REALTIME ------------------------------------------------------------------------
            // tslint:disable-next-line: deprecation
            const data = device;
            if (data && data.c8y_Position) {
                this.updateLocationChangeTime(data);
                if (this.allMarkers[data.id]) {
                    this.__updateMarkerPosition(data, (!isBeacon && this.followDevice));
                } else {
                    // Remove existing layers
                    if (isSwitch) {
                        this.featureGroup.forEach((fg, idx) => {
                            this.layerControl.removeLayer(fg.layer);
                        });
                    }
                    if (!data.c8y_Position.alt) {
                        data.c8y_Position.alt = 0;
                    }
                    const aMarker = this.__createMarker(data, this, isBeacon);
                    // if (isDevMode()) console.log("+-+-+- marker created ", aMarker);
                    this.allMarkers[data.id] = aMarker;
                    if (!mapBounds) {
                        mapBounds = new L.LatLngBounds(aMarker.getLatLng(), aMarker.getLatLng());
                    } else {
                        mapBounds.extend(aMarker.getLatLng());
                    }
                    let fgOnLvl = this.featureGroup.find((i) => (i.name === data.c8y_Position.alt));
                    const markers = L.markerClusterGroup();
                    if (!fgOnLvl) {
                        if (this.isClusterMap) {
                            markers.addLayer(aMarker);
                            fgOnLvl = { name: Number(data.c8y_Position.alt), layer: L.featureGroup([markers]) };
                            L.setOptions(fgOnLvl.layer, { name: data.c8y_Position.alt });
                        } else {
                            fgOnLvl = { name: Number(data.c8y_Position.alt), layer: L.featureGroup([aMarker]) };
                            L.setOptions(fgOnLvl.layer, { name: data.c8y_Position.alt });
                            if (isDevMode()) { console.log('+-+-+- adding feature group for single marker ', fgOnLvl); }
                        }
                        this.featureGroup.push(fgOnLvl);
                    } else {
                        if (this.isClusterMap) {
                            markers.addLayer(aMarker);
                            fgOnLvl.layer.addLayer(markers);
                        } else {
                            fgOnLvl.layer.addLayer(aMarker);
                        }
                    }
                    this.addLayerToMap(themap, mapBounds, maxZoom);
                }
            }
            if (this.realtime) {
                const manaogedObjectChannel = `/managedobjects/${device.id}`;
                const detailSubs = this.realTimeService.subscribe(
                manaogedObjectChannel,
                (resp) => {
                    const data = (resp.data ? resp.data.data : {});
                    // check if this marker has already been created... and has an altitude as well to indicate its floor
                    // if no position is given, no update is done
                    if (data && data.c8y_Position) {
                        this.updateLocationChangeTime(data);
                        if (this.allMarkers[data.id]) {
                            this.__updateMarkerPosition(data, (!isBeacon && this.followDevice));
                        }
                    }
                });
                this.allSubscriptions.push({
                    id: device.id, subs: detailSubs,
                    type: (isBeacon ? 'Beacon' : this.isBeaconActive ? 'Tag' : 'GPS')
                });
            }
        }
    }

    /**
     * Render multpile devices on map
     */
    private async addDevicesToMap(deviceList: any[], themap, mapBounds, maxZoom?: number): Promise<void> {
        // if there is a single device in the group, treat it as a single device
        this.defaultActivateDevices();
        if (deviceList && deviceList.length === 1) {
            this.updateDeviceData(deviceList[0]);
            this.addSingleDeviceToMap(deviceList[0], themap, mapBounds, null);
        } else {
            deviceList.forEach(device => {
                if (device.c8y_Position && !device.c8y_Position.alt) {
                    device.c8y_Position.alt = 0;
                }
                if (!device.type) {
                    device.type = 'default';
                }
            });
            const devicesByFloorAndCat = groupArray(deviceList, 'c8y_Position.alt', 'type');

            if (isDevMode()) { console.log('+-+- devices by FLOOR/CATEGORY: ', devicesByFloorAndCat); }
            if (devicesByFloorAndCat) {
                Object.keys(devicesByFloorAndCat).forEach(fKey => {
                    const categoryFeatureGroups = [];
                    const categoriesInFloor = devicesByFloorAndCat[fKey];
                    const markers = L.markerClusterGroup();
                    Object.keys(categoriesInFloor).forEach(key => {
                        const devicesInType = categoriesInFloor[key];
                        devicesInType.forEach(imo => {
                            this.updateDeviceData(imo);
                            const isBeacon = this.checkIsBeacon(imo.id);
                            if (imo.c8y_Position && imo.c8y_Position.lat && imo.c8y_Position.lng
                                && (isBeacon || !this.hasChildDevice(imo.id) && this.isActiveDevice(imo.id))) {
                                /* if (!isBeacon) {
                                    this.setMapPosition(imo.c8y_Position.lat, imo.c8y_Position.lng);
                                } */
                                if (this.allMarkers[imo.id]) {
                                    this.__updateMarkerPosition(imo, (!isBeacon && this.followDevice));
                                } else {
                                    // create a marker per device found...
                                    try {
                                        const aMarker = this.__createMarker(imo, this, isBeacon);
                                        this.allMarkers[imo.id] = aMarker;
                                        if (isDevMode()) { console.log('+-+-+- marker created\n ', this.allMarkers); }
                                        if (!mapBounds) {
                                            mapBounds = new L.LatLngBounds(aMarker.getLatLng(), aMarker.getLatLng());
                                        } else {
                                            mapBounds.extend(aMarker.getLatLng());
                                        }
                                        if (this.isClusterMap) {
                                            markers.addLayer(aMarker);
                                            categoryFeatureGroups.push(markers);
                                        } else {
                                            categoryFeatureGroups.push(aMarker);
                                        }
                                        // tslint:disable-next-line: deprecation
                                        const manaogedObjectChannel = `/managedobjects/${imo.id}`;
                                        const detailSubs = this.realTimeService.subscribe(
                                            manaogedObjectChannel,
                                            (resp) => {
                                            
                                            const mobj = (resp.data ? resp.data.data : {});
                                            this.updateLocationChangeTime(mobj);
                                            if (isDevMode()) { console.log('+-+- subscribing for object\n', [mobj, imo]); }
                                            this.__updateMarkerPosition(mobj, (!isBeacon && this.followDevice));
                                            }
                                        );
                                        if (this.realtime) {
                                            this.allSubscriptions.push({
                                                id: imo.id, subs: detailSubs,
                                                type: (isBeacon ? 'Beacon' : this.isBeaconActive ? 'Tag' : 'GPS')
                                            });
                                        } else {
                                            this.realTimeService.unsubscribe(detailSubs);
                                            //detailSubs.unsubscribe();
                                        }
                                    } catch (error) {
                                        if (isDevMode()) {
                                            console.log('+-+-+- error while creating and adding marker to map\n ', [error, imo]);
                                        }
                                    }
                                }
                            } else {
                                if (isDevMode()) { console.log('+-+- device without location\n', imo); }
                            }
                        });
                    });
                    if (categoryFeatureGroups.length > 0) {
                        let fgOnLvl = this.featureGroup.find((i) => (i.name === Number(fKey)));
                        if (!fgOnLvl) {
                            fgOnLvl = { name: Number(fKey), layer: L.featureGroup(categoryFeatureGroups) };
                            L.setOptions(fgOnLvl.layer, { name: Number(fKey) });
                            this.featureGroup.push(fgOnLvl);
                        } else {
                            categoryFeatureGroups.forEach((layer) => {
                                fgOnLvl.layer.addLayer(layer);
                            });
                        }
                    }
                });
                this.addLayerToMap(themap, mapBounds, maxZoom);
            }
        }
    }

    /**
     * THis method is used to load all layers(marker, geofence, heatmap, etc) on map based on given configuration
     */
    private async addLayerToMap(themap: any, mapBounds: any, maxZoom: any) {
        if (themap) {
          //  await this.getChildLocationEventAndUpdateTime();
            // add to the map only the first layer that will be shown
            let initLayerSet = false;
            const startingFloor = this.checkLowestMarkerFloor();
            this.featureGroup.forEach((fg, idx) => {
                // this will set the layer to be shown initially. Should not show levels without devices initially...
                // the feature group will contain devices and plans as layers.
                if (!initLayerSet && (this.featureGroup.length === 1 || fg.name === startingFloor)) {
                    fg.layer.addTo(themap);
                    initLayerSet = true;
                }
                if (this.featureGroup.length > 1) {
                    this.layerControl.addBaseLayer(fg.layer, fg.name);
                }
                if ((this.isIndoor || this.isBeaconActive) && this.indoorImageBounds) {
                    const indoorImageBounds = this.indoorImageBounds.filter(bound => bound.level === fg.name);
                    if (indoorImageBounds.length > 1) {
                        indoorImageBounds.forEach(imgBound => {
                            if (imgBound.imageBounds.contains(mapBounds)) {
                                mapBounds = imgBound.imageBounds;
                            }
                        });
                    } else {
                        if (indoorImageBounds[0]) { mapBounds = indoorImageBounds[0].imageBounds; }
                    }
                }
            });
            if (!this.isIndoor) {
                if (this.isBeaconActive && this.indoorImageBounds) {
                    themap.fitBounds(mapBounds, { maxZoom: this.floorZoom });
                } else {
                    this.hideInfraOnMap();
                    let zoomLevel = this.initialMaxZoom;
                    if (!mapBounds)  {
                        mapBounds = this.__initMapBounds(mapBounds);
                        zoomLevel = this.initialMinZoom;
                    }
                    themap.flyToBounds(mapBounds, { maxZoom: this.isBeaconActive ? this.floorZoom : zoomLevel });
                }
            }
            if (this.featureGroup && this.featureGroup.length > 1) {
                this.layerControl.addTo(themap);
            }
            this.isBusy = false;
            this.allDeviceList = [];
            this.devicesToGetChildList = [];
        }
    }

    /**
     * This method is used to findout which is lowest floor based on all markers attitude details.
     */
    private checkLowestMarkerFloor() {
        let floor = null;
        for (const markerId of Object.keys(this.allMarkers)) {
            if (this.allMarkers[markerId].options && this.allMarkers[markerId].options.floor !== undefined) {
                if (floor === null) {
                    floor = this.allMarkers[markerId].options.floor;
                } else if (this.allMarkers[markerId].options.floor <= floor) {
                    floor = this.allMarkers[markerId].options.floor;
                }
            }
        }
        return (floor ?  floor : 0);
    }
    private __initMapBounds(mapBounds) {
        if (!mapBounds) {
            const lat = this.rootLat != null ? this.rootLat : this._initCoords.lat;
            const long = this.rootLong != null ? this.rootLong : this._initCoords.long;
            mapBounds = new L.LatLngBounds([lat, long], [lat, long]);
        }
        return mapBounds;
    }
    toggleRealTime() {
        this.realtime = !this.realtime;
        if (this.realtime) {
            this.reloadMap(false);
        } else {
            this.clearSubscriptions();
        }
    }
    onMarkerValueChange(value) {
        this.selectedMarkerToggleValue = value;
        this.initializeAndLoadMap(false);
    }
    toggleDraggable(evt) {
        this.isDraggable = !this.isDraggable;
        for (const markerId of Object.keys(this.allMarkers)) {
            if (this.isDraggable) {
                if (this.allMarkers[markerId].dragging) {
                    this.allMarkers[markerId].dragging.enable();
                } else {
                    this.allMarkers[markerId].options.draggable = true;
                }
            } else {
                if (this.allMarkers[markerId].dragging) {
                    this.allMarkers[markerId].dragging.disable();
                } else {
                    this.allMarkers[markerId].options.draggable = false;
                }
            }
        }
    }

    /**
     * This method is used to create marker for given device
     */
    private __createMarker(mo: IManagedObject, theThis: any, isBeacon?: boolean) {
        // add floor plan, stored in the position's altitude, as option in the marker for later comparisons...
        const iconMarker = L.ExtraMarkers.icon({
            icon: this.__getIconForType(mo),
            iconColor: (this.iconColorField && this.iconColorField !== ''  && mo[this.iconColorField] ? mo[this.iconColorField] : (this.iconColor !== '' ? this.iconColor : '#fff')),
            extraClasses: 'fa-sm',
            markerColor: (this.markerColorField && this.markerColorField !== '' &&  mo[this.markerColorField]  ? mo[this.markerColorField] : this.__getColorForType(mo.type)),
            shape: (this.shapeColorField && this.shapeColorField !== '' && mo[this.shapeColorField] ? mo[this.shapeColorField] :  (this.markerShape ? this.markerShape : (isBeacon ? 'square' : 'circle'))),
            svg: 'false',
            prefix: 'fa'
        });
        const parentData = (this.loadChildDevices ? this.getParentDeviceData(mo.id) : null);
        const iconOpts = {
            title: (parentData ? parentData.name : mo.name),
            id: mo.id,
            floor: mo.c8y_Position.hasOwnProperty('alt') ? mo.c8y_Position.alt : 0,
            icon: iconMarker,
            draggable: this.isDraggable
        };
        const markerLatLng = L.latLng(mo.c8y_Position);
        const mkr = L.Marker.movingMarker([markerLatLng, markerLatLng], [1000], iconOpts);
        const mpp = L.popup({ className: 'lt-popup' });
        let elem = [
            { label: 'Name:', value: mo.name }, { label: 'ID:', value: mo.id }, { label: 'Type:', value: mo.type }
        ];
        let tabGroup = null;
        let dashboardId = null;
        const dashboardObj = this.configDashboardList.find((dashboard) => dashboard.type === mo.type);
        if (dashboardObj && dashboardObj.templateID) {
            if (dashboardObj.withTabGroup) {
                dashboardId = dashboardObj.templateID;
                tabGroup = mo.id;
            } else if (dashboardObj.tabGroupID) {
                dashboardId = dashboardObj.templateID;
                tabGroup = dashboardObj.tabGroupID;
            } else {
                dashboardId = dashboardObj.templateID;
            }
        } else {
            if (this.dashboardField) {
                dashboardId = this.getNavigationFields(this.dashboardField, (parentData ? parentData : mo));
            }
            if (this.tabGroupField) {
                tabGroup = this.getNavigationFields(this.tabGroupField, (parentData ? parentData : mo));
            }
        }
        let deviceListDashboard = [];
        deviceListDashboard = mo.deviceListDynamicDashboards;
        if (parentData && this.loadChildDevices) {
            elem = [
                { label: 'Name:', value: parentData.name },
                { label: 'ID:', value: parentData.id },
                { label: 'Type:', value: parentData.type },
                { label: 'Tracker:', value: mo.name }
            ];
        }
        const markerData = {
            elem,
            dashboardId,
            tabGroup
        };
        let ppContent = '';
        if (dashboardId) {
            this.createNavigationPopupForMarker(null, mpp, markerData);
        } else {
            ppContent = this.__getPopupContent(elem);
        }
        mkr.bindPopup(mpp)
            .on('popupopen', function($event) {
                if (isDevMode()) { console.log('+-+- MARKER POPUPOPEN FIRED ', [this, $event, theThis]); }
                if (ppContent) {
                    mpp.setContent(ppContent);
                }
            })
            .on('click', (e) => {
                if (isDevMode()) { console.log('+-+- MARKER CLICK FIRED ', e); }
            })
            .on('popupclose', $event => {
            });
        return mkr;
    }

    /**
     * Create popup content for device marker where dashboard link is not provided
     */
    private __getPopupContent(elems): string {
        let ppContent = '';
        for (const elem of elems) {
            ppContent = ppContent +
                `<div class="lt-popup-row"><label class="">${elem.label}</label><div class="" title="${elem.value}">${elem.value}</div></div>`;
        }
        return ppContent;
    }

    /**
     * @depricated
     * Findout navigation property in device object 
     */
    private getNavigationFields(dashboardField, deviceObj) {
        let navigationField = null;
        const dashboardFields = dashboardField.split('.');
        const dashboardFieldObj = deviceObj[dashboardFields[0]];
        if (dashboardFieldObj && Array.isArray(dashboardFieldObj) && dashboardFields.length === 2) {
            if (dashboardFieldObj.length > 0) {
                const deviceWithAppId = dashboardFieldObj.find((dashboard) => dashboard.appId === this.appId);
                if (deviceWithAppId) {
                    navigationField = deviceWithAppId[dashboardFields[1]];
                } else {
                    navigationField = dashboardFieldObj[0][dashboardFields[1]];
                }
            }
        } else if (dashboardFieldObj && dashboardFields.length === 2) {
            navigationField = dashboardFieldObj[dashboardFields[1]];
        } else {
            navigationField = (dashboardFieldObj ? dashboardFieldObj : dashboardFields[0]);
        }
        return navigationField;
    }

    /**
     * Attached Navigation popup with component resolver.
     */
    private createNavigationPopupForMarker(layer: any, popup: any, data?: any) {
        const compFactory = this.resolver.resolveComponentFactory(GPSmartMapPopupComponent);
        this.popupDetailCompRef = compFactory.create(this.injector);
        if (this.appRef.attachView) { // since 2.3.0
            this.appRef.attachView(this.popupDetailCompRef.hostView);
        } else {
            // tslint:disable-next-line: no-string-literal
            this.appRef['registerChangeDetector'](this.popupDetailCompRef.changeDetectorRef);
        }

        const div = document.createElement('div');
        div.appendChild(this.popupDetailCompRef.location.nativeElement);
        popup.setContent(div);
        if (data) {
            this.popupDetailCompRef.instance.editData = data;
        }
    }
    /**
     * Returns the Font Awesome icon class to be used depending on the device type retrieved from Cumulocity
     */
    private __getIconForType(mo: any): string {
        if(this.isMarkerIconFromAssetType && this.selectedMarkerToggleValue !== 'Devices') {
            if(mo.icon && mo.icon.name) {
                return `dlt-c8y-icon-${mo.icon.name}`;
            }
        } 
        if (this.markerIcon !=='') {
            return `dlt-c8y-icon-${this.markerIcon}`;
        }
        const type = mo.type;
        if (type) {
            if (type.toLowerCase().includes('beacon')) {
                return 'fa-bullseye';
            } else if (type.toLowerCase().includes('tag')) {
                return 'fa-tag';
            } else if (type.toLowerCase().includes('controller')) {
                return 'fa-connectdevelop';
            } else if (type.toLowerCase().includes('camera')) {
                return 'fa-camera';
            } else {
                return 'fa-asterisk';
            }
        }
        return 'fa-asterisk';
    }
    private __getColorForType(type: string): string {
        if(this.markerColor !== '') { return this.markerColor;}
        if (type) {
            if (type.toLowerCase().includes('beacon')) {
                return '#2c9f45';
            } else if (type.toLowerCase().includes('tag')) {
                return '#1776bf';
            } else if (type.toLowerCase().includes('controller')) {
                return '#344ef7';
            } else if (type.toLowerCase().includes('camera')) {
                return '#d9534f';
            } else {
                return '#1776bf';
            }
        }
        return '#1776bf';
    }

    /**
     * Update marker position based on realtime device movement
     */
    private __updateMarkerPosition(data: IManagedObject, doFollow: boolean) {
        // this.allMarkers[data.id].setLatLng(new L.latLng(data.c8y_Position.lat, data.c8y_Position.lng));
        const newPosLatLng = new L.latLng(data.c8y_Position.lat, data.c8y_Position.lng);
        this.allMarkers[data.id].moveTo(newPosLatLng, 2000);
        if (doFollow && !this.isIndoor && !this.isBeaconActive) {
            const mapBounds = new L.LatLngBounds(newPosLatLng, newPosLatLng);
            this.map.flyToBounds(mapBounds, { maxZoom: this.initialMaxZoom});
        }
        // update layer if changed... and the properties are provided
        if ('floor' in this.allMarkers[data.id].options && 'alt' in data.c8y_Position) {
            const oldAlt = this.allMarkers[data.id].options.floor;
            const newAlt = (data.c8y_Position.alt ? data.c8y_Position.alt : 0 );
            if (oldAlt !== newAlt && !this.isClusterMap) {
                if (isDevMode()) { console.log('+-+- markers old level is ' + oldAlt + ' vs new level ' + newAlt); }
                const oldFeatureGroup = this.featureGroup.find(fg => fg.name === oldAlt);
                oldFeatureGroup.layer.removeLayer(this.allMarkers[data.id]); // marker removed from feature group
                if (this.followDevice) {
                    const oldFeatureGroupList = this.featureGroup.filter(fg => fg.name !== newAlt);
                    oldFeatureGroupList.forEach( (fgroup) => {
                        this.map.removeLayer(fgroup.layer); // feature group removed from map
                    });
                }
                let newFeatureGroup = this.featureGroup.find(fg => fg.name === newAlt);
                if (newFeatureGroup) {
                    newFeatureGroup.layer.addLayer(this.allMarkers[data.id]);
                } else {
                    // create feature group and add layer
                    newFeatureGroup = { name: Number(data.c8y_Position.alt), layer: L.featureGroup([this.allMarkers[data.id]]) };
                    if (isDevMode()) { console.log('+-+-+- adding new feature group ', newFeatureGroup); }
                    L.setOptions(newFeatureGroup.layer, { name: data.c8y_Position.alt });
                    this.featureGroup.push(newFeatureGroup);
                }
                if (doFollow) {
                    newFeatureGroup.layer.addTo(this.map);
                    this.activeFloor = newAlt;
                }
                this.allMarkers[data.id].options.floor = newAlt;
            }
        }
    }

    /**
     * Render floor plan on map
     */
    protected __doRenderFloorPlans() {
        const filter: object = {
            pageSize: 15,
            withTotalPages: true,
            fragmentType: 'floorLevel' // 'sag_BuildingFloorPlan'
        };
        let theInvList = null;
        const queryString = `type eq c8y_Building and assetType eq ${this.floorFragmentTypes}`;
        this.cmonSvc.getInventoryItems(1, theInvList, queryString)
            .then((deviceFound) => {
                theInvList = deviceFound.data;
                this.floorPlanData = theInvList;
                if (isDevMode()) { console.log('+-+- INVENTORY FOUND ', theInvList); }
                const promisesToLoadFps = [];
                theInvList.forEach((bfp) => {
                    if (this.isIndoor) {
                        const indoorImaggeBounds = new L.LatLngBounds(bfp.coordinates);
                        if (indoorImaggeBounds) {
                            this.__doRenderMap(indoorImaggeBounds);
                        } else { this.__doRenderMap(null); }
                        this.__initMapHandlers();
                    }
                    if (bfp.levels !== undefined) {
                        bfp.levels.forEach(floorLvl => {
                            let fgOnLvl = this.featureGroup.find((i) => (i.name === Number(floorLvl.level)));
                            if (!fgOnLvl) {
                                fgOnLvl = { name: Number(floorLvl.level), layer: L.featureGroup([]) };
                                L.setOptions(fgOnLvl.layer, { name: Number(floorLvl.level) });
                                this.featureGroup.push(fgOnLvl);
                            }
                            if (bfp.levels.length > 0 && floorLvl.id) {
                                promisesToLoadFps.push(this.__loadFloorPlan(bfp.coordinates, floorLvl, bfp.name));
                            }
                        });
                    } else {
                        if (isDevMode()) { console.log('+-+- BUILDING FLOOR PLAN MISSING LEVEL PROPERTY\n', bfp); }
                    }
                });
                if (isDevMode()) { console.log('+-+- created all promises to load floor plans\n', promisesToLoadFps); }
                const allLoadedFps = Promise.all(promisesToLoadFps);
                Promise.all(promisesToLoadFps).then((results: any[]) => {
                    for (const fpOverlay of results) {
                         const floorLvl = fpOverlay.options.floorLevel;
                         const fgOnLvl = this.featureGroup.find((i) => (i.name === floorLvl));
                         fgOnLvl.layer.addLayer(fpOverlay);
                         if (isDevMode()) { console.log('+-+-+ ADDING IMAGE OVERLAY TO FEATURE GROUP ', fgOnLvl); }
                    }
                })
                .then(() => {
                    if (this.isHeatMap) {
                        this.addLayerToMap(this.map, this.defaultBounds, null);
                        this.renderDevicesForHeatMapEvents(this.deviceId);
                    } else {
                        this.renderDevicesAndEvents();
                    }
                });
                if (isDevMode()) { console.log('+-+- AFTER created all promises to load floor plans\n', allLoadedFps); }
            })
            .catch((err) => {
                if (isDevMode()) { console.log('+-+- ERROR FOUND WHILE GETTING inventory... ', err); }
            });
    }
    onResized(event: ResizedEvent) {
        this.__updateMapSize(event.newWidth, event.newHeight);
        if (this.map) {
            this.map.invalidateSize();
        }
    }
    protected __updateMapSize(w: number, h: number): void {
        if (w > 0 && h > 0) {
            this.width = w - 20;
            this.height = h - this.mapInfosDiv.offsetHeight - 10; // 10px from styling :/
        } else {
            this.width = this.mapDiv.parentElement.offsetWidth - 20;
            this.height = this.mapDiv.parentElement.offsetHeight - this.mapInfosDiv.offsetHeight - 10; // 10px from styling :/
        }
    }
    /**
     * Initialize Leaflet Map handlers
     */
    protected __initMapHandlers(): void {
        this.map.invalidateSize();
        this.map.on('click', this.onClickHandler);
        this.map.on('baselayerchange', this.onLayerChangeHandler);
        this.map.on('overlayadd', this.onOverlaySelectHandler);
        this.movingMarkerService.initializeMovingMarker(L);
        if (this.isHeatMap) {
            this.heatLayerService.initHeatLayer(L);
            this.heatLayer = L.heatLayer([], {
                minOpacity: 0.4,
                radius: 25,
                max: 1,
                maxZoom: this.floorZoom,
                gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' }
            }).addTo(this.map);
        }
    }
    /**
     * Execute on Leaflet Map click
     */
    protected __doClickOnMap(evt: any): void {
         if (isDevMode()) { console.log('+-+- map clicked ', evt); }
         const target: any = evt.originalEvent.target;
        // Lat and Long are embedded in the event object
         const lat: string = evt.latlng.lat;
         const long: string = evt.latlng.lng;
         if (isDevMode()) { console.log('Map click on: ', [target, { lat, long }, this.map, this.featureGroup]); }
    }
    protected __doSwitchLayer(evt: any): void {
        this.activeFloor = evt.name;
        if (isDevMode()) { console.log('+-+- LAYER SWITCHED\n', evt); }
        this.loadOverlay();
    }
    protected __onImageOverlayClick(evt: any): void {
        // TODO: update to do something else when clicking on the image
        this.__doClickOnMap(evt);
    }
    protected __doSelectOverlay(evt: any): void {
        if (isDevMode()) { console.log('+-+- Overlay Selected\n', evt); }
        evt.layer.bringToFront();
    }

    /**
     * Load overlay for geofences
     */
    protected loadOverlay() {
        if (this.isGeofence) {
            this.allGoefences.forEach(gfOnLvl => {
                if (gfOnLvl.floor === this.activeFloor) {
                    gfOnLvl.layer.bringToFront();
                    this.layerControl.addOverlay(gfOnLvl.layer, gfOnLvl.name);
                } else {
                    this.layerControl.removeLayer(gfOnLvl.layer);
                    this.map.removeLayer(gfOnLvl.layer);
                }
            });
        }
        if (this.isGeofence) {
            this.layerControl.addTo(this.map);
        }
    }
    /**
     * Load floor plan for given floor level
     */
    // tslint:disable-next-line: variable-name
    protected __loadFloorPlan = (coordinates: any, FLlevel: any, name) => {
        if (isDevMode()) { console.log('+-+- promising loading floor plan ' + FLlevel.id); }
        return new Promise(
            (resolve, reject) => {
                if (!coordinates || coordinates.length <= 0) {
                    reject({ reason: 'Building Floor Plan does not have the needed image coordingate boundaries.' });
                }
                let imgOverlay = null;
                this.invBinSvc.download(FLlevel.id)
                    .then(function(resp) {
                        if (resp.status === 200) {
                            resp.blob().then(function(blb) {
                                let corners = null;
                                let topLeft = null;
                                let topRight = null;
                                let bottomLeft = null;
                                if (FLlevel.imageDetails && FLlevel.imageDetails.corners) {
                                    corners = FLlevel.imageDetails.corners;
                                    topLeft = corners[0];
                                    topRight = corners[1];
                                    bottomLeft = corners[2];
                                } else {
                                    corners = coordinates;
                                    topLeft = coordinates[1];
                                    topRight = coordinates[2];
                                    bottomLeft = coordinates[0];
                                }
                                let imageBounds = null;
                                imageBounds = new L.LatLngBounds(corners);
                                this.indoorImageBounds.push({
                                    level: Number(FLlevel.level),
                                    imageBounds
                                });
                                const reader = new FileReader();
                                reader.addEventListener('load', (event: any) => {
                                    if (this.cmonSvc.isValidJson(event.target.result)) {
                                        const geoJsonFileContent = JSON.parse(event.target.result);
                                        if (this.map) {
                                            // tslint:disable-next-line: max-line-length
                                            imgOverlay = L.geoJSON(geoJsonFileContent, {
                                                className: 'lt-image-overlay', style: this.geoJSONStyle,
                                            zIndex: 1, name, floorLevel: Number(FLlevel.level)});
                                            resolve(imgOverlay);
                                        }
                                    } else if (this.cmonSvc.isSVGImage(event.target.result)) {
                                        const svgFileContent = this.cmonSvc.createElementFromHTML(event.target.result);
                                        if (this.map) {
                                            // tslint:disable-next-line: max-line-length
                                            imgOverlay = L.svgOverlay(svgFileContent, imageBounds, {
                                                className: 'lt-image-overlay', style: this.geoJSONStyle,
                                                zIndex: 1, name, floorLevel: Number(FLlevel.level)
                                            });
                                            resolve(imgOverlay);
                                        }
                                    } else {
                                        const imgBlobURL = URL.createObjectURL(blb);
                                        if (this.map) {
                                            imgOverlay = L.imageOverlay.rotated(imgBlobURL, topLeft,
                                                topRight, bottomLeft, {
                                                opacity: 1,
                                                interactive: false,
                                                className: 'lt-image-overlay',
                                                zIndex: 1,
                                                name,
                                                floorLevel: Number(FLlevel.level)
                                            });
                                            resolve(imgOverlay);
                                        } else {
                                            if (isDevMode()) { console.log('+-+- MAP UNKNOWN ', this.map); }
                                        }
                                    }
                                });
                                reader.readAsText(blb);
                            }.bind(this));
                        }
                    }.bind(this));
            }
        );
    }

    /**
     * Render geofence on map
     */
    private __doRenderGeofencesOnMap() {
        if (this.floorPlanData && this.floorPlanData.length > 0) {
            if (isDevMode()) { console.log('+-+- ADDITION FOUND ', this.floorPlanData); }
            this.floorPlanData.forEach((bfp) => {
                if (bfp.levels && bfp.levels.length > 0) {
                    bfp.levels.forEach(level => {
                        const geoFencesByLevels = [];
                        let fgOnLvl = this.allGoefences.find((i) => (i.floor === Number(level.level)));
                        if (level.geofences && level.geofences.length > 0) {
                            level.geofences.forEach(geofences => {
                                const geoCoord = geofences.coordinates.map((coord => ({...coord, alt: Number(level.level)})));
                                const geoFence = new L.Polygon(geoCoord, {
                                    color: 'blue', weight: 1, className: 'lt-gf-base'
                                });
                                geoFencesByLevels.push(geoFence);
                            });
                        }
                        if (!fgOnLvl) {
                            fgOnLvl = { name: 'GeoFence', floor: Number(level.level), layer: L.featureGroup(geoFencesByLevels) };
                            this.allGoefences.push(fgOnLvl);
                        } else {
                            geoFencesByLevels.forEach((geofence) => {
                                fgOnLvl.layer.addLayer(geofence);
                            });
                        }
                    });
                }
            });
            if (this.allGoefences && this.allGoefences.length > 0) {
                this.loadOverlay();
            }
        } else {
            if (isDevMode()) { console.log('+-+- GEOFENCES NOT RENDERED IN DASHBOARDS NOT ASSIGED TO A GROUP/DEVICE...'); }
        }
    }

    /**
     * Date change method for heatmap date filter
     */
    dateChanged(x, event) {
        if (x === 'from') {
            this.fromDate = event.value;
            this.minToDate = new Date(this.fromDate);
            this.minToDate.setDate(this.minToDate.getDate() + 1);
        } else {
            this.toDate = event.value;
        }
    }

    /**
     * Heamap date filter method
     */
    async filter() {
        this.isBusy = true;
        this.heatLayer.setLatLngs([]);
        this.heatLayer.addTo(this.map);
        await this.renderHeatMapEvents();
        this.isBusy = false;
    }

    /**
     * Render devices for given groupd id for heatmap
     */
    protected renderDevicesForHeatMapEvents(deviceId): void {
        let deviceList: any = null;
        if (deviceId) {
            this.cmonSvc.getTargetObject(deviceId)
                .then((mo) => {
                    if (mo &&
                        (mo.type && (mo.type.localeCompare(C8Y_DEVICE_GROUP) === 0 || mo.type.localeCompare(C8Y_DEVICE_SUBGROUP) === 0))) {
                        // GET child devices
                        this.cmonSvc.getChildDevices(deviceId, 1, this.selectedMarkerToggleValue, deviceList)
                            .then((deviceFound) => {
                                deviceList = deviceFound.data;
                                deviceList.forEach(element => {
                                    this.heatMapDeviceEventID.push(element.id);
                                    if (this.realtime) {
                                        this.realtTimeHeatMapEvents(element.id, 'CREATE');
                                    }
                                });
                            })
                            .catch((err) => {
                                if (isDevMode()) { console.log('+-+- ERROR FOUND WHILE GETTING CHILD DEVICES For HeatMap... ', err); }
                            });
                    } else {
                         // this.updateDeviceMatrix(mo.id, deviceId, isBeacon);
                        this.heatMapDeviceEventID.push(mo.id);
                        if (this.realtime) {
                            this.realtTimeHeatMapEvents(mo.id, 'CREATE');
                        }
                    }
                })
                .catch((err) => {
                    if (isDevMode()) { console.log('+-+- ERROR while getting context object details for HeatMap Devices ', err); }
                });
        } else {
            // Invalid configuration for Heatmap
        }
    }

    /**
     * Render Heatmap events for given filter dates
     */
    private async renderHeatMapEvents() {
        const deviceEventType = this.locationEventType.split(',').map(value => value.trim());
        const heatData = [];
        const eventData = [];
        let eventCounter = 0;
        await this.heatMapDeviceEventID.forEach(async eventSourceId => {
            let eventListData = null;
            eventListData = await this.cmonSvc.getEventList(2000, 1, eventListData, eventSourceId, deviceEventType,
                moment(this.fromDate).format('YYYY-MM-DDTHH:mm:ssZ'),
                moment(this.toDate).format('YYYY-MM-DDTHH:mm:ssZ'), -1, false);
            if (isDevMode()) { console.log('-------heatMap event subscribed-----', eventData); }
            if (eventListData && eventListData.data && eventListData.data.length > 0) {
                eventData.push.apply(eventData, eventListData.data);
            }
            eventCounter++;
            if (eventCounter === this.heatMapDeviceEventID.length && eventData && eventData.length > 0) {
                const dataLength1 = eventData.length;
                eventData.forEach(event => {
                    const eventC8yPosition = event.c8y_Position;
                    if (eventC8yPosition) {
                        const findData = heatData.find((heatObj) =>
                            heatObj.lng === eventC8yPosition.lng && heatObj.lat === eventC8yPosition.lat);
                        if (findData) {
                            const intensity = this.calculateHeatMapIntensity(event, eventData.length);
                            findData.intensity = findData.intensity + intensity;
                        } else {
                            const intensity = this.calculateHeatMapIntensity(event, eventData.length);
                            heatData.push({ lng: eventC8yPosition.lng, lat: eventC8yPosition.lat, intensity});
                        }
                    }
                });
                this.populateHeatMap(heatData);
                this.isBusy = false;
            }
        });
    }

    /**
     * Realtime heatmap subscription and rendering heat on map for given device id.
     */
    private realtTimeHeatMapEvents(sourceId, realtimeAction) {
        const deviceEventType = this.locationEventType.split(',').map(value => value.trim());
        const eventURL = `/eventsWithChildren/${sourceId}`;
        const realTimeEventSub = this.realTimeService.subscribe(eventURL, (response) => {
            if (response && response.data) {
                const eventData = response.data;
                if (eventData.realtimeAction === realtimeAction && eventData.data) {
                    deviceEventType.forEach(eventType => {
                        if (eventData.data.type && eventType.toLowerCase() === eventData.data.type.toLowerCase()) {
                            if (this.isLastEventHeatmap) {
                                if (eventData.data.c8y_Position) {
                                    const eventC8yPosition = eventData.data.c8y_Position;
                                    this.heatMapRealTimeLastEventData = this.heatMapRealTimeLastEventData.
                                        filter(lastEventData => lastEventData.id !== sourceId);
                                    this.heatMapRealTimeLastEventData.push ({
                                        id: sourceId,
                                        lng: eventC8yPosition.lng,
                                        lat: eventC8yPosition.lat,
                                        quantity: (this.heatMapQuantity && eventData.data[this.heatMapQuantity] ?
                                            eventData.data[this.heatMapQuantity] : null )
                                    });
                                    this.heatLayer.setLatLngs([]);
                                    let heatIntensityPerRequest = (this.heatIntensityPerEvent / this.heatMapDeviceEventID.length);
                                    if (isDevMode()) { console.log('heatmap intensity per requrest', heatIntensityPerRequest); }
                                    this.heatMapRealTimeLastEventData.forEach(heatEvent => {
                                        if (heatEvent.quantity) {
                                            heatIntensityPerRequest = (heatIntensityPerRequest * heatEvent.quantity ) ;
                                        }
                                        this.heatLayer.addLatLng([heatEvent.lat, heatEvent.lng, heatIntensityPerRequest]);
                                    });
                                }
                            } else {
                                this.heatMapRealtimeEventCounter++;
                                if (eventData.data.c8y_Position) {
                                    const eventC8yPosition = eventData.data.c8y_Position;
                                    const findData = this.heatMapRealtimeData.find((heatObj) =>
                                        heatObj.lng === eventC8yPosition.lng && heatObj.lat === eventC8yPosition.lat);
                                    if (findData) {
                                        const intensity = this.calculateHeatMapIntensity(eventData.data, this.heatMapRealtimeEventCounter);
                                        findData.intensity = findData.intensity + intensity;
                                    } else {
                                        const intensity = this.calculateHeatMapIntensity(eventData.data, this.heatMapRealtimeEventCounter);
                                        this.heatMapRealtimeData.push({ lng: eventC8yPosition.lng, lat: eventC8yPosition.lat, intensity });
                                    }
                                    this.populateHeatMap(this.heatMapRealtimeData);
                                }
                            }
                        }
                    });
                }
            }
        });
        this.allSubscriptions.push({
            id: sourceId, subs: realTimeEventSub,
            type: 'Events'
        });
    }
    private populateHeatMap(heatData) {
        heatData.forEach(heatEvent => {
            this.heatLayer.addLatLng([heatEvent.lat, heatEvent.lng, heatEvent.intensity]);
        });
    }

    /**
     * Calculate heatmap intensity based on event length
     */
    private calculateHeatMapIntensity(event, dataLength) {
        let intensity = (this.heatIntensityPerEvent / (dataLength > 100 ? dataLength : 100));
        if (this.heatMapQuantity && event[this.heatMapQuantity]) {
            intensity = intensity * event[this.heatMapQuantity] ;
        }
        return intensity;
    }

    /**
     * Fatch indoor tag's event. Applicable for hybrid map
     */
    private fetchTagEvents() {
        if (this.deviceTagId) {
            const tagList = this.deviceTagId.split(',').map(value => value.trim());
            tagList.forEach( tag => {
                this.RealtimeTagLocationUpdateEvents(tag);
            });
            if (!this.intervalObj && tagList.length > 0) {
                this.intervalObj = setInterval(() => this.checkLatestTagEvents(), 10000);
            }
        } else {

        }
    }

    /**
     * Check recent tag event to calculate time difference.
     * This will help to switch between indoor and outdoor tracker.
     * Applicable for Hybrid map only
     */
    private checkLatestTagEvents() {
        this.tagEventMatrix.forEach((tag: TagsEventsMatrix) => {
            const timeDiff = (new Date().getTime() - tag.lastEventTime) / 1000;
            if (isDevMode()) {
                console.log('last event time difference =' + timeDiff);
                console.log(' last tag  = ', tag.deviceId);
                console.log(' last tag avg time = ', tag.eventAvgTime);
                console.log('last event time difference =' + timeDiff);
            }
            if (timeDiff < (tag.eventAvgTime * 2)) {
                this.renderAndSubscribeDevice('GPS', true, tag.deviceId);
            } else if (this.isBeaconActive !== null) {
                this.renderAndSubscribeDevice('Tag', false, tag.deviceId);
            }
        });
    }

    /**
     * it will load existing location event and calculate avg time based on last 3 events.
     * this will also subscribed for realtime events
     */
    private RealtimeTagLocationUpdateEvents(sourceId) {
        const deviceEventType = this.locationEventType.split(',').map(value => value.trim());
        const realtimeOps = {
            realtime: true,
            hot: true,
        };
        const now = moment();
        // tslint:disable-next-line: deprecation
        this.events.list(
            {
            pageSize: 100,
            dateTo: now.add(1, 'days').format('YYYY-MM-DDTHH:mm:ssZ'),
            dateFrom: '1970-01-01',
            source: sourceId
        },
        ).then(res => {
            let data = res.data;
            data = data.filter((record) => deviceEventType.indexOf(record.type) > -1);
            data = data.filter((device, idx) => idx < 3);
            if (isDevMode()) {console.log('------------event subscribed-----', data); }
            this.checkLatestTagLocationEvents(data, sourceId, false);
            // Custom RealTime
            this.realtTimeEvents(sourceId, 'CREATE', deviceEventType);
        //    eventSub.unsubscribe();
        });
    }

    /**
     * Subscripton for realtime location event for given source id
     */
    private realtTimeEvents(sourceId, realtimeAction, deviceEventType) {
        const eventURL = `/eventsWithChildren/${sourceId}`;
        const realTimeEventSub = this.realTimeService.subscribe(eventURL, (response) => {
            if (response && response.data) {
                const eventData = response.data;
                if (eventData.realtimeAction === realtimeAction && eventData.data) {
                        deviceEventType.forEach(eventType => {
                            if (eventData.data.type && eventType.toLowerCase() === eventData.data.type.toLowerCase()) {
                                this.checkLatestTagLocationEvents(eventData.data, sourceId, true);
                            }
                        });
                }
            }
        });
        this.allSubscriptions.push({
            id: sourceId, subs: realTimeEventSub,
            type: 'Events'
        });
    }

    /**
     * for realtime events: It will update last event time for indoor tracker
     * for non realtime events: It will calculate avg time based on creation time of last 3 events
     */
    private checkLatestTagLocationEvents(eventData, sourceId, realTime) {
        if (realTime) {
            if (eventData) {
                const tagEventLog = this.tagEventMatrix.find(tagEvents => tagEvents.deviceId === sourceId);
                tagEventLog.lastEventTime = new Date(Date.parse(eventData.creationTime)).getTime();
                this.tagEventMatrix = this.tagEventMatrix.filter(tagEvents => tagEvents.deviceId !== sourceId);
                this.tagEventMatrix.push(tagEventLog);
            }
        } else {
            if (eventData && eventData.length > 0) {
                let avgTime = this.beaconPingDuration;
                let timeCalc = 0;
                let prevTime = 0;
                eventData.forEach(event => {
                    if (prevTime !== 0) {
                        timeCalc += (prevTime - (new Date(Date.parse(event.creationTime)).getTime() / 1000));
                    }
                    prevTime = new Date(Date.parse(event.creationTime)).getTime() / 1000;
                });
                avgTime = Math.round(timeCalc / (eventData.length - 1));
                if (isDevMode()) { console.log(' average time=', avgTime); }
                const eventTimeLog: TagsEventsMatrix = {};
                eventTimeLog.deviceId = sourceId;
                eventTimeLog.eventAvgTime = avgTime;
                eventTimeLog.lastEventTime = new Date(Date.parse(eventData[0].creationTime)).getTime();
                this.tagEventMatrix = this.tagEventMatrix.filter(tagEvents => tagEvents.deviceId !== sourceId);
                this.tagEventMatrix.push(eventTimeLog);
            } else {
            }
        }
    }

    /**
     * Render and subscribe indoor/outdoor tracker device
     */
    private renderAndSubscribeDevice(type, isBeaconActive, deviceId) {
        if (this.isBeaconActive == null) {
            this.isInitialDeviceRender = true;
        } else { this.isInitialDeviceRender = false; }
        if (this.isBeaconActive !== isBeaconActive) {
            this.isBeaconActive = isBeaconActive;
            let data = null;
            let removeDeviceId = null;
            if (isBeaconActive) {
                this.showInfraOnMap();
                data = this.activateIndoorDeviceOnMap(deviceId);
                removeDeviceId = this.getCurrentActiveDeviceId(deviceId, 'InDoor');
            } else {
                this.hideInfraOnMap();
                removeDeviceId = this.getCurrentActiveDeviceId(deviceId, 'OutDoor');
                data = this.activateOutdoorDeviceOnMap(deviceId);
            }
            if (data) {
                this.clearSubscriptionsAndMarker(type, removeDeviceId);
                this.addSingleDeviceToMap(data, this.map, this.defaultBounds, null, true);
                if (isDevMode()) {console.log('Rendering  Tracker= ' + (this.isBeaconActive ? 'Tag' : 'GPS')); }
            }
        }
    }
    /**
     * Clear subscription and marker when tracker switch from indoor to outdoor and vice versa
     */
    private clearSubscriptionsAndMarker(type, deviceId) {
        if (this.allSubscriptions) {
            this.allSubscriptions.forEach((s) => {
                if (s.type === type) {
                    if (isDevMode()) { console.log('+-+- UNSUBSCRIBING FOR ', s.id); }
                   // s.subs.unsubscribe();
                    this.realTimeService.unsubscribe(s.sub);
                    delete this.allSubscriptions[s];
                }
            });
        }
        if (this.allMarkers) {
            const marker = this.allMarkers[deviceId];
            if (marker) {
                const oldFeatureGroup = this.featureGroup.find(fg => fg.name === marker.options.floor);
                oldFeatureGroup.layer.removeLayer(marker); // marker removed from feature group
                this.featureGroup.forEach((fg, idx) => {
                    this.layerControl.removeLayer(fg.layer);
                });
                delete this.allMarkers[deviceId];
            }
        }
    }
}
