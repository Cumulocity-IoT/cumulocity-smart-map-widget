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
import { Component, OnInit, Input, OnChanges, SimpleChanges, Inject, isDevMode, OnDestroy, ViewEncapsulation } from '@angular/core';
import { Commonc8yService } from '../common/c8y/commonc8y.service';
import { INIT_COORDS} from '../common/tokens';
import { InitCordInterface } from '../common/interfaces/initCord.interface';
import { AppIdService } from '../common/app-id.service';

@Component({
  // tslint:disable-next-line: component-selector
  selector: 'lib-gp-smart-map-config',
  templateUrl: './gp-smart-map.config.component.html',
  styleUrls: ['./gp-smart-map.config.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class GPSmartMapConfigComponent implements OnInit, OnChanges, OnDestroy {

  @Input() config: any = {};
  floorFragmentTypes = null;
  defaultOutdoorZoom = 14;
  defaultIndoorZoom = 20;
  defaultHeatIntesity = 1;
  appId = null;

  // tslint:disable-next-line: variable-name
  constructor(@Inject(INIT_COORDS) protected _initCoords: InitCordInterface, private cmonSvc: Commonc8yService,
              private appIdService: AppIdService ) {
    if (isDevMode()) { console.log('+-+- constructor config ', this); }
  }

  ngOnInit() {
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

    this.loadFloorPlanTypes();
    this.appId = this.appIdService.getCurrentAppId();
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
  // for development purpose only
  ngOnChanges(changes: SimpleChanges): void {
    if (isDevMode()) { console.log('+-+- changes detected..', changes); }
  }

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

}
