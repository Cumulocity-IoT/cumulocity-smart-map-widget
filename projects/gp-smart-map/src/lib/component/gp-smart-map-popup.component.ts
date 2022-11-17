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
import { Component, OnInit, Input } from '@angular/core';
import { Router } from '@angular/router';
import { Commonc8yService } from '../common/c8y/commonc8y.service';

@Component({
    selector: 'lib-gp-smart-map-popup',
    templateUrl: './gp-smart-map-popup.component.html',
    styleUrls: ['./gp-smart-map-popup.component.css']
})

export class GPSmartMapPopupComponent implements OnInit {
    @Input() uniqueId: any;
    @Input() editData: any;

    constructor(private router: Router, private commonService: Commonc8yService) {}
    popupDisplayList = [];
    dashboardId = null;
    tabGroupId = null;
    appId = null;

    ngOnInit(): void {
        this.appId = this.commonService.getAppId();
        if (this.editData) {
            this.popupDisplayList = this.editData.elem;
            this.dashboardId = this.editData.dashboardId;
            this.tabGroupId = this.editData.tabGroup;
        }
    }
    // Navigation to dashboard from smart map
    navigateToDashboard(deviceId) {
        if (this.dashboardId && this.tabGroupId) {
            this.router.navigate(
                [`/application/${this.appId}/tabgroup/${this.tabGroupId}/dashboard/${this.dashboardId}/device/${deviceId}`]);
        } else if (this.dashboardId && !this.tabGroupId) {
            this.router.navigate([`/application/${this.appId}/dashboard/${this.dashboardId}/device/${deviceId}`]);
        }
    }
}
