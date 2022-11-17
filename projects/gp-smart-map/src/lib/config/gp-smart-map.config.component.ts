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
import { Component, OnInit, Input, OnChanges, SimpleChanges, Inject, isDevMode, OnDestroy, ViewEncapsulation, DoCheck } from '@angular/core';
import { Commonc8yService } from '../common/c8y/commonc8y.service';
import { INIT_COORDS} from '../common/tokens';
import { InitCordInterface } from '../common/interfaces/initCord.interface';


export interface DashboardConfig {
  type?: any;
  templateID?: string;
  tabGroupID?: string;
  tabGroup?: boolean;
}

@Component({
  // tslint:disable-next-line: component-selector
  selector: 'lib-gp-smart-map-config',
  templateUrl: './gp-smart-map.config.component.html',
  styleUrls: ['./gp-smart-map.config.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class GPSmartMapConfigComponent implements OnInit, OnDestroy, DoCheck {

  @Input() config: any = {};
  floorFragmentTypes = null;
  defaultOutdoorZoom = 14;
  defaultIndoorZoom = 20;
  defaultHeatIntesity = 1;
  appId = null;
  iconColorCode ='#000000'
  markerColorCode ='#000000'
  isExpandedDBS = false;
  dashboardList: DashboardConfig[] = [];
  deviceTypes = null;
  configDevice = '';
  deviceAssetList = [];
  devicesToGetChildList = [];
  hierarchyLevel = 0;
  isBusy = false;
  // tslint:disable-next-line: variable-name
  constructor(@Inject(INIT_COORDS) protected _initCoords: InitCordInterface, private cmonSvc: Commonc8yService ) {
    if (isDevMode()) { console.log('+-+- constructor config ', this); }
  }

  async ngOnInit() {
    if (isDevMode()) { console.log('+-+- init config ', this); }
    if (!this.config.selectedMarkerToggleValue) {
      this.config.selectedMarkerToggleValue = 'All';
    }
    if (!this.config.mapType) {
      this.config.mapType = 'OutDoor';
    }
    if (!this.config.outdoorZoom) {
      this.config.isOutdoorAutoZoom = true;
      this.config.outdoorZoom = this.defaultOutdoorZoom;
    }
    if (!this.config.indoorZoom) {
      this.config.isIndoorAutoZoom = true;
      this.config.indoorZoom = this.defaultIndoorZoom;
    }
    if (!this.config.heatIntensityPerEvent) {
      this.config.isHeatmapAutoIntensity = true;
      this.config.heatIntensityPerEvent = this.defaultHeatIntesity;
    }

    if (!this.config.loadChildDevices) {
      this.config.loadChildDevices = false;
    }
    if (this.config.isLastEventHeatmap === undefined) {
      this.config.isLastEventHeatmap = true;
    }
    if (!this.config.heatMapLegendLow) {
      this.config.heatMapLegendLow = 'Low';
    }
    if (!this.config.heatMapLegendMedium) {
      this.config.heatMapLegendMedium = 'Medium';
    }
    if (!this.config.heatMapLegendHigh) {
      this.config.heatMapLegendHigh = 'High';
    }

    if(!this.config.isMarkerIconFromAssetType){
      this.config.isMarkerIconFromAssetType = false;
    }

    if(this.config.hierarchyLevel) {
        this.hierarchyLevel = parseInt(this.config.hierarchyLevel);
    } else {
      this.config.hierarchyLevel = "0";
    }
    if(!this.config.markerShape) {
      this.config.markerShape = 'circle';
    }

    this.loadFloorPlanTypes();
    this.appId = this.cmonSvc.getAppId();
    this.appId = '121';
    if (!this.config.dashboardList && this.appId) {
      const dashboardObj: DashboardConfig = {};
      dashboardObj.type = 'All';
      this.dashboardList.push(dashboardObj);
      this.config.dashboardList = this.dashboardList;
    }
    if (!this.config.device) {
      this.config.device = {};
    }
    else {
      this.configDevice = this.config.device.id;
      if(this.appId) {
        await this.getAllDevices();
      }
    }

    if(this.config.markerColor) {   this.markerColorUpdateByTyping(this.config.markerColor)  }
    if(this.config.iconColor) {   this.colorUpdateByTyping(this.config.iconColor)  }
  }

  // Set indoor zoom to default
  indoorAutoChanges(event) {
    this.config.indoorZoom = this.defaultIndoorZoom;
  }

   // Set outdoor zoom to default
  outdoorAutoChanges(event) {
    this.config.outdoorZoom = this.defaultOutdoorZoom;
  }

   // Set heatmap intensity to default
  heatMapIntensityAutoChanges(event) {
    this.config.heatIntensityPerEvent = this.defaultHeatIntesity;
  }

  /**
   * Reset configuration parameters when map is changed
   */
  onMapOptionsSelected(event) {
    this.config.selectedMarkerToggleValue = 'All';
    this.config.floorFragmentTypes = '';
    this.config.beaconGroupId = '';
    this.config.deviceTagId = '';
    this.config.GPSTrackerId = '';
    this.config.locationEventType = '';
    this.config.heatMapQuantity = '';
    this.config.loadChildDevices = false;
    this.config.tabGroupField = '';
    this.config.dashboardField = '';
    this.config.isLastEventHeatmap = true;
  }
 /*  // for development purpose only
  ngOnChanges(changes: SimpleChanges): void {
    if (isDevMode()) { console.log('+-+- changes detected..', changes); }
  } */

  ngOnDestroy(): void {
    if (isDevMode()) { console.log('+-+- destroying..'); }
  }

  // Load unique asset types for floor plan images.
  private loadFloorPlanTypes() {
    const theInvList = null;
    this.floorFragmentTypes = [];
    this.cmonSvc.getInventoryItems(1, theInvList, 'type eq c8y_Building')
      .then((deviceFound) => {
        this.floorFragmentTypes = Array.from(new Set(deviceFound.data.map(item => item.assetType)));
      })
      .catch((err) => {
        if (isDevMode()) { console.log('+-+- ERROR FOUND WHILE GETTING inventory... ', err); }
      });
  }

  // Update the icon colors input from color input box
  colorUpdateByTyping(colorTyped): void {
    this.iconColorCode = colorTyped;
  }

  // Update the icon colors input from color picker
  colorUpdate(colorSelected): void {
      this.config.iconColor = colorSelected;
  }
  // Update the marker colors input from color picker
  markerColorUpdate(colorSelected): void {
    this.config.markerColor = colorSelected;
  }

  // Update the marker colors input from color input box
  markerColorUpdateByTyping(colorTyped): void {
    this.markerColorCode = colorTyped;
  }

  /**
   * Get All devices/Assets's type
   */
   async getAllDevices() {
    this.isBusy = true;
    const deviceList: any = null;
    this.deviceAssetList = [];
    this.devicesToGetChildList = [];
    this.deviceTypes = null;
    this.hierarchyLevel = (this.config.hierarchyLevel ? parseInt(this.config.hierarchyLevel): 0);
    await this.getChildDevicesAssets( { id: '8200', level: 0 },  -1);
    if(this.deviceAssetList.length > 0) {
      this.deviceTypes = Array.from(new Set(this.deviceAssetList.map(item => item.type)));
      this.deviceTypes = this.deviceTypes.filter(n => n);
    }
    this.isBusy = false;
  }


  /** Find all child devices and assets based on hierarchy level */
  private async getChildDevicesAssets(record: any, recordCounter: number) {
    const mo = await this.cmonSvc.getTargetObject(record.id) ;
    recordCounter ++;
    if (mo && !mo.c8y_IsDevice) {
      if (record.level !== 0) { this.filterBySelectedType(mo); };
      if(record.level === 0 || record.level < this.hierarchyLevel) {
        const deviceData = await this.cmonSvc.getChildDevices(record.id, 1, this.config.selectedMarkerToggleValue, null);
        const data = deviceData?.data;
        this.deviceAssetList.push.apply(this.deviceAssetList, deviceData.data);
        if (record.level < this.hierarchyLevel) {
          data.forEach(element => {
            this.updateChildDeviceList(element, ++record.level );
          });
        }
      }
      
      if (recordCounter < this.devicesToGetChildList.length) {
        await this.getChildDevicesAssets(this.devicesToGetChildList[recordCounter], recordCounter);
      }
    } else  {
      this.filterBySelectedType(mo);
      this.updateChildDeviceList(mo, ++record.level);
      if(recordCounter <  this.devicesToGetChildList.length) {
        await this.getChildDevicesAssets(this.devicesToGetChildList[recordCounter],recordCounter);
      }
    }
  }

  /** filter devices/assets based on user selection */
  private filterBySelectedType(mo: any) {
    if((this.config.selectedMarkerToggleValue === 'Assets' &&  mo.c8y_IsAsset) ||
    (this.config.selectedMarkerToggleValue === 'Devices' && mo.c8y_IsDevice) ||
     (this.config.selectedMarkerToggleValue !== 'Devices' && this.config.selectedMarkerToggleValue !== 'Assets' ) ) {
      this.deviceAssetList.push(mo);
    } 
  }

  /** Update child devices/assets for next loop */
  private updateChildDeviceList(element: any, level:number) {
    if (element.childDevices && element.childDevices.references) {
      const childDevices = element.childDevices.references;
      childDevices.forEach(childObj => {
        this.devicesToGetChildList.push({
          id: childObj.managedObject.id,
          level: level
        });
      });
    }
    if (element.childAssets && element.childAssets.references) {
      const childAssets = element.childAssets.references;
      childAssets.forEach(childObj => {
        this.devicesToGetChildList.push({
          id: childObj.managedObject.id,
          level: level
        });
      });
    }
  }

  /**
   * Add new Row for Dashbaord Settings
   */
  addNewRecord(currentIndex) {
    if ((currentIndex + 1) === this.config.dashboardList.length) {
      const dashboardObj: DashboardConfig = {};
      dashboardObj.type = 'All';
      this.config.dashboardList.push(dashboardObj);
    }
  }

  ngDoCheck(): void {
    if (this.config.device && this.config.device.id  && this.config.device.id !== this.configDevice) {
      this.configDevice = this.config.device.id;
      this.getAllDevices();
    }
  }
}
