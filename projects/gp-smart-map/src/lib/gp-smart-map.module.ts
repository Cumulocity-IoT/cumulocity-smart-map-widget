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
import { NgModule } from '@angular/core';
import { Commonc8yService } from './common/c8y/commonc8y.service';
import { CoreModule, HOOK_COMPONENTS} from '@c8y/ngx-components';
import { INIT_COORDS } from './common/tokens';
import {
  MatPaginatorModule, MatFormFieldModule, MatInputModule, MatDividerModule,
  MatProgressBarModule, MatButtonModule, MatSortModule, MatSlideToggleModule,
  MatDialogModule, MatSelectModule, MatButtonToggleModule, MatDatepickerModule,
  MatNativeDateModule, MatMenuModule, MatIconModule, MatSliderModule
} from '@angular/material';
import { MatTableModule } from '@angular/material/table';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AngularResizedEventModule } from 'angular-resize-event';
import { MovingMarkerService } from './common/movingMarker.service';
import { HeatLayerService } from './common/heatLayer.service';
import { GPSmartMapComponent } from './component/gp-smart-map.component';
import { GPSmartMapConfigComponent } from './config/gp-smart-map.config.component';
import * as preview from './preview-image';
import { ImageRotateService } from './common/imageRotate.service';
import { AppIdService } from './common/app-id.service';
import { GPSmartMapPopupComponent } from './component/gp-smart-map-popup.component';
@NgModule({
  declarations: [GPSmartMapComponent, GPSmartMapConfigComponent, GPSmartMapPopupComponent],
  imports: [
    CoreModule,
    MatTableModule,
    MatPaginatorModule,
    BrowserAnimationsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSortModule,
    MatButtonModule,
    MatDialogModule,
    MatSelectModule,
    MatProgressBarModule,
    MatButtonToggleModule,
    MatMenuModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSlideToggleModule,
    MatSliderModule,
    AngularResizedEventModule
  ],
  exports: [GPSmartMapComponent, GPSmartMapConfigComponent, GPSmartMapPopupComponent],
  entryComponents: [GPSmartMapComponent, GPSmartMapConfigComponent, GPSmartMapPopupComponent],
  providers: [
    Commonc8yService, MovingMarkerService, HeatLayerService, ImageRotateService, AppIdService,
    {
      provide: HOOK_COMPONENTS,
      multi: true,
      useValue: {
        id: 'smart-map-widget',
        label: 'Smart Map',
        previewImage: preview.previewImage,
        description: 'The Smart Map widget help you to track real-time device locations in indoor as well as in outdoor.',
        component: GPSmartMapComponent,
        configComponent: GPSmartMapConfigComponent,
        data: {
          ng1: {
            options: {
              noDeviceTarget: false,
              noNewWidgets: false,
              deviceTargetNotRequired: false,
              groupsSelectable: true
            }
          }
        }
      }
    },

    { provide: INIT_COORDS, useValue: { lat: 49.814334, long: 8.637085 } }
  ]
})
export class GPSmartMapModule {
  constructor(private appIdService: AppIdService) {}
 }
