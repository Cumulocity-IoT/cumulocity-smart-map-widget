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
import { isDevMode, Injectable } from '@angular/core';
import { InventoryBinaryService, InventoryService, IManagedObject,
    IResultList, MeasurementService, IResult, IManagedObjectBinary,
    EventService } from '@c8y/client';
import { BehaviorSubject } from 'rxjs';
import { C8yPosition } from '../interfaces/c8y.position';
import { C8Y_DEVICE_GROUP, C8Y_DEVICE_SUBGROUP } from '../tokens';

@Injectable()
export class Commonc8yService {

    constructor(
        private invSvc: InventoryService,
        private msmtSvc: MeasurementService,
        private inventoryBinaryService: InventoryBinaryService,
        private eventService: EventService
        ) { }

    createBinary(floorMap): Promise<IResult<IManagedObjectBinary>> {
        return this.inventoryBinaryService.create(floorMap.file, {level: floorMap.level,
             buildingId: floorMap.buildingId, file: {name: floorMap.file.name}});
    }

    deleteBinary(id): Promise<IResult<IManagedObjectBinary>> {
        return this.inventoryBinaryService.delete(id);
    }

    downloadBinary(id): any {
        return this.inventoryBinaryService.download(id);
    }

    /**
     * Retrieve the details for the specified managed object as a Promise
     *
     * @param deviceId Id of the managed object
     */
    getTargetObject(deviceId: string): any {
        if (isDevMode()) { console.log('+-+- checking for ', deviceId); }
        return new Promise(
            (resolve, reject) => {
                this.invSvc.detail(deviceId)
                    .then((resp) => {
                        if (isDevMode()) { console.log('+-+- DETAILS FOR MANAGED OBJECT ' + deviceId, resp); }
                        if (resp.res.status === 200) {
                            resolve(resp.data);
                        } else {
                            reject(resp);
                        }
                    });
            });
    }

    /**
     * This service will recursively get all the child devices for the given device id and return a promise with the result list.
     *
     * @param id ID of the managed object to check for child devices
     * @param pageToGet Number of the page passed to the API
     * @param allDevices Child Devices already found
     */
    getChildDevices(id: string, pageToGet: number, allDevices: { data: any[], res: any }): Promise<IResultList<IManagedObject>> {
        const inventoryFilter = {
            // fragmentType: 'c8y_IsDevice',
            pageSize: 50,
            withTotalPages: true,
            currentPage: pageToGet
        };
        if (!allDevices) {
            allDevices = { data: [], res: null };
        }
        return new Promise(
            (resolve, reject) => {
                this.invSvc.childAssetsList(id, inventoryFilter)
                    .then((resp) => {
                        if (resp.res.status === 200) {
                            if (resp.data && resp.data.length >= 0) {
                                allDevices.data.push.apply(allDevices.data, resp.data);
                                if (isDevMode()) { console.log('+-+- checking on devices found\n', resp); }
                                // response does not have totalPages... :(
                                // suppose that if # of devices is less that the page size, then all devices have already been retrieved
                                if (resp.data.length < inventoryFilter.pageSize) {
                                    resolve(allDevices);
                                } else {
                                    this.getChildDevices(id, resp.paging.nextPage, allDevices)
                                        .then((np) => {
                                            resolve(allDevices);
                                        })
                                        .catch((err) => reject(err));
                                }
                            }
                            // resolve(resp);
                        } else {
                            reject(resp);
                        }
                    });
            });
    }

    /**
     * This method will get all devices where c8y_position is available
     */
    getAllDevices(pageToGet: number, allDevices: { data: any[], res: any }): Promise<IResultList<IManagedObject>> {
        const inventoryFilter = {
            fragmentType: 'c8y_IsDevice',
            pageSize: 10,
            withTotalPages: true,
            query: 'has(c8y_Position)',
            currentPage: pageToGet
        };
        if (!allDevices) {
            allDevices = { data: [], res: null };
        }

        return new Promise(
            (resolve, reject) => {
                this.invSvc.list(inventoryFilter)
                    .then((resp) => {
                        if (resp.res.status === 200) {
                            if (resp.data && resp.data.length >= 0) {
                                allDevices.data.push.apply(allDevices.data, resp.data);
                                if (resp.data.length < inventoryFilter.pageSize) {
                                    resolve(allDevices);
                                } else {
                                    this.getAllDevices(resp.paging.nextPage, allDevices)
                                        .then((np) => {
                                            resolve(allDevices);
                                        })
                                        .catch((err) => reject(err));
                                }
                            }
                        } else {
                            reject(resp);
                        }
                    });
            });


    }

    /**
     * This service will recursively get all the child devices for the given device id.
     *
     * @param id ID of the managed object to check for child additions
     * @param pageToGet Number of the page passed to the API
     * @param allAdditions Child additions already found... the newly found additions will be aded here
     * @param type Type of addition to return... the service does not use the "fragmentType"
     */
    getChildAdditions(id: string, pageToGet: number,
                      allAdditions: { data: any[], res: any }, type: string): Promise<IResultList<IManagedObject>> {
        const inventoryFilter = {
            // fragmentType: type,
            // valueFragmentType: type,
            // type: type,
            pageSize: 15,
            withTotalPages: true,
            currentPage: pageToGet
        };
        if (!allAdditions) {
            allAdditions = { data: [], res: null };
        }
        return new Promise(
            (resolve, reject) => {
                this.invSvc.childAdditionsList(id, inventoryFilter)
                    .then((resp) => {
                        if (resp.res.status === 200) {
                            if (resp.data && resp.data.length >= 0) {
                                allAdditions.data.push.apply(allAdditions.data, resp.data);
                                if (isDevMode()) { console.log('+-+- checking on additions found\n', resp); }
                                // response does not have totalPages... :(
                                // suppose that if # of devices is less that the page size, then all devices have already been retrieved
                                if (resp.data.length < inventoryFilter.pageSize) {
                                    allAdditions.data = allAdditions.data.filter(d => {
                                        return d.type && d.type.localeCompare(type) === 0;
                                    });
                                    resolve(allAdditions);
                                } else {
                                    this.getChildAdditions(id, resp.paging.nextPage, allAdditions, type)
                                        .then((np) => {
                                            resolve(allAdditions);
                                        })
                                        .catch((err) => reject(err));
                                }
                            }
                        } else {
                            reject(resp);
                        }
                    });
            });
    }

    /**
     * Get All Inventory Items for given query string
     */
    getInventoryItems(pageToGet: number, allInventoryItems: { data: any[], res: any },
                      queryString: string): Promise<IResultList<IManagedObject>> {
        let inventoryFilter: any;
        inventoryFilter = {
            // fragmentType: 'FloorWidget', // 'floorLevel',
            pageSize: 50,
            withTotalPages: true,
            currentPage: pageToGet,
            query: `${queryString}`
        };
        if (!allInventoryItems) {
            allInventoryItems = { data: [], res: null };
        }
        return new Promise(
            (resolve, reject) => {
                this.invSvc.list(inventoryFilter)
                    .then((resp) => {
                        if (resp.res.status === 200) {
                            if (resp.data && resp.data.length >= 0) {
                                allInventoryItems.data.push.apply(allInventoryItems.data, resp.data);
                                if (isDevMode()) { console.log('+-+- checking on inventory items found\n', resp); }
                                // response does not have totalPages... :(
                                // suppose that if # of devices is less that the page size, then all devices have already been retrieved
                                if (resp.data.length < inventoryFilter.pageSize) {
                                    // remove the additions that does not fit into the given type, if any
                                    resolve(allInventoryItems);
                                } else {
                                    this.getInventoryItems(resp.paging.nextPage, allInventoryItems, queryString)
                                        .then((np) => {
                                            resolve(allInventoryItems);
                                        })
                                        .catch((err) => reject(err));
                                }
                            }
                        } else {
                            reject(resp);
                        }
                    });
            });
    }

    /**
     * Get Available Measurements for child devices
     */
    getAvailableMeasurementsForChildDevices(aDevice: any, measurementsList: any, observableMeasurements$: BehaviorSubject<any>): void {
        let deviceList: any = null;
        const avMmt = null;
        if (aDevice) {
            // if the map is inside a dashboard for a single object or a group
            // get all child assets for the target object, defined in the configuration
            this.getTargetObject(aDevice.id)
                .then((mo) => {
                    if (mo && (mo.type.localeCompare(C8Y_DEVICE_GROUP) === 0 || mo.type.localeCompare(C8Y_DEVICE_SUBGROUP) === 0)) {
                        // GET child devices
                        this.getChildDevices(aDevice.id, 1, deviceList)
                            .then((deviceFound) => {
                                deviceList = deviceFound.data;
                                if (isDevMode()) { console.log('+-+- FOUND CHILD DEVICES:\n ', deviceList); }
                                const uniqueDeviceList = deviceList
                                    .filter((device, index, self) =>
                                        index === self.findIndex((t) => (t.type === device.type)))
                                    .map((device) => device.id);
                                if (isDevMode()) { console.log('+-+- FOUND unique DEVICES by TYPE:\n ', uniqueDeviceList); }
                                for (const deviceId of uniqueDeviceList) {
                                    if (isDevMode()) { console.log('+-+- CHECKING MEASUREMENTS FOR: ', deviceId); }
                                    this.__getMeasurementSeries(deviceId, '2000-01-01', '2050-01-01')
                                        .then(msmtFound => {
                                            if (isDevMode()) { console.log('+-+- MEASUREMENTS FOR... ' + deviceId, msmtFound); }
                                            if (measurementsList) {
                                                msmtFound.forEach(mf => {
                                                    const existingM = measurementsList.find(sm => sm.type === mf.type);
                                                    if (!existingM || existingM == null) {
                                                        // measurement type not yet found
                                                        if (isDevMode()) { console.log('+-+- MEASUREMENTS NOT FOUND... ' +
                                                         deviceId, msmtFound); }
                                                        measurementsList.push(mf);
                                                    } else {
                                                        // check if all measurement names are in there
                                                        const newM = [];
                                                        existingM.measurement.forEach(m => {
                                                            const newMM = mf.measurement.find(mmf => mmf.name === m.name);
                                                            if (!newMM) {
                                                                newM.push(newMM);
                                                            }
                                                        });
                                                        existingM.measurement = existingM.measurement.concat(newM);
                                                    }
                                                });
                                            } else {
                                                measurementsList = msmtFound;
                                            }
                                            observableMeasurements$.next(measurementsList);
                                            // let myNewMeasurements = Object.assign([], measurementsList);
                                            // this should trigger changed detection in angular...
                                            // TODO: look for a better option
                                            // measurementsList = myNewMeasurements;
                                        })
                                        .catch(err => {
                                            if (isDevMode()) {
                                                console.log('+-+- ERROR FOUND WHILE GETTING MEASUREMENTS FOR... ' + deviceId, err); }
                                        });
                                }
                            })
                            .catch((err) => {
                                if (isDevMode()) { console.log('+-+- ERROR FOUND WHILE GETTING CHILD DEVICES... ', err); }
                            });
                    } else {
                        // this is a single device...
                        // this.addSingleDeviceToMap(mo, this.map, this.defaultBounds);
                        // this.addDevicesToMap([mo], this.map, this.defaultBounds);
                        deviceList = [mo];
                        if (isDevMode()) { console.log('+-+- FOUND SINGLE DEVICE:\n ', deviceList); }
                    }
                })
                .catch((err) => {
                    if (isDevMode()) { console.log('+-+- ERROR while getting context object details for dashboard ', err); }
                });
        }
        // return avMmt;
    }

  /*   getLastMeasurementForSource(sourceId: string, dateFrom: string, dateTo: string): ObservableList<IMeasurement> {
        const msmtFilter = {
            pageSize: 1,
            // valueFragmentType: deviceType + "Info",
            dateFrom: dateFrom,
            dateTo: dateTo,
            revert: true
        };
        const realtimeOps = {
            realtime: true,
            realtimeAction: RealtimeAction.UPDATE
        };
        // tslint:disable-next-line: deprecation
        return this.msmtSvc.listBySource$(sourceId, msmtFilter, realtimeOps);
    } */

    /**
     * Update device location
     */
    updatePosition(assetId: string, position: C8yPosition): Promise<any> {
        if (isDevMode()) { console.log('+-+- UPDATING ASSET ', assetId); }
        const assetToUpdate: Partial<IManagedObject> = {
            id: assetId,
            c8y_Position: position
        };
        return new Promise(
            (resolve, reject) => {
                this.invSvc.update(assetToUpdate)
                    .then((resp) => {
                        if (isDevMode()) { console.log('+-+- DETAILS FOR MANAGED OBJECT UPDATE' + assetId, resp); }
                        if (resp.res.status === 200) {
                            resolve(resp.data);
                        } else {
                            reject(resp);
                        }
                    });
            });

    }
    /**
     * Creates the given object using the InventoryService.
     *
     * @param managedObject Object to be created
     * @returns Promise object with the result of the service call
     */
    createManagedObject(managedObject): Promise<any> {
        if (isDevMode()) { console.log('+-+- CREATING MANAGED OBJECT '); }

        return this.invSvc.create(managedObject);
        /* return new Promise(
            (resolve, reject) => {
                this.invSvc.create(managedObject)
                    .then((resp) => {
                        if (isDevMode()) { console.log('+-+- DETAILS FOR MANAGED OBJECT CREATION', resp); }
                        // successful return code is 201 Created
                        if (resp.res.status === 201) {
                            resolve(resp.data);
                        } else {
                            reject(resp);
                        }
                    });
            }); */
    }

    updateManagedObject(managedObject): Promise<any> {
        if (isDevMode()) { console.log('+-+- CREATING MANAGED OBJECT '); }
        return this.invSvc.update(managedObject);
    }

    deleteManagedObject(id): Promise<any> {
        return this.invSvc.delete(id);
    }

    private __getMeasurementSeries(deviceId: string, dateFrom: string, dateTo: string): Promise<any> {
        const theMsmt = [];
        const msmtFilter = {
            // fragmentType: 'c8y_IsDevice',
            // pageSize: 1,
            // valueFragmentType: deviceType + "Info",
            source: deviceId,
            dateFrom,
            dateTo,
            // revert: true
        };
        // const realtimeOps = {
        //     realtime: false,
        //     // realtimeAction: RealtimeAction.UPDATE
        // };

        return new Promise(
            (resolve, reject) => {
                this.msmtSvc.listSeries(msmtFilter)
                    .then((resp) => {
                        if (resp.res.status === 200) {
                            if (isDevMode()) { console.log('+-+- FOUND MEASUREMENTS:\n ', resp); }
                            if (resp.data && resp.data.series) {
                                resp.data.series.forEach(s => {
                                    const newM = { name: s.name, unit: s.unit, show: false };
                                    let theSerie = theMsmt.find(sm => sm.type === s.type);
                                    if (!theSerie || theSerie == null) {
                                        theSerie = { type: s.type, measurement: [newM] };
                                        theMsmt.push(theSerie);
                                    } else {
                                        const theM = theSerie.measurement.find(m => m.name === s.name);
                                        if (!theM || theM == null) {
                                            theSerie.measurement.push(newM);
                                        }
                                    }
                                });
                                if (isDevMode()) { console.log('+-+- MEASUREMENTS TO SHOW:\n ', theMsmt); }
                                resolve(theMsmt);
                            }
                            resolve(null);
                        } else {
                            reject(resp);
                        }
                    });
            });
    }

    /**
     * Get Event List for perticular device based on filter criteria
     */
    getEventList(pageSize: number, pageToGet: number, allEventList: { data: any[], res: any }, sourceId: any,
                 eventTypes: any, fromDate: any, toDate: any,
                 numberOfRecords: number, isWithSource: boolean): Promise<IResultList<IManagedObject>> {
        let eventFilter: any;
        eventFilter = {
            pageSize,
            withTotalPages: true,
            currentPage: pageToGet,
            dateFrom: fromDate,
            dateTo: toDate,
        };
        if (isWithSource) {
            eventFilter.withSourceAssets = true;
            eventFilter.withSourceDevices = true;
        }
        if (!allEventList) {
            allEventList = { data: [], res: null };
        }
        return new Promise(
            (resolve, reject) => {
                // tslint:disable-next-line: deprecation
                const eventSub = this.eventService.listBySource$(sourceId, eventFilter)
                    .subscribe((resp: any) => {
                        if (resp) {
                            if (resp && resp.length >= 0) {
                                resp = resp.filter((record) => eventTypes.indexOf(record.type) > -1);
                                allEventList.data.push.apply(allEventList.data, resp);
                                if (isDevMode()) { console.log('+-+- checking on Event items found\n', resp); }
                                // response does not have totalPages... :(
                                // suppose that if # of devices is less that the page size, then all devices have already been retrieved
                                if (resp.length < eventFilter.pageSize ||
                                    (numberOfRecords > 0 && allEventList.data.length <= numberOfRecords)) {
                                    // remove the additions that does not fit into the given type, if any
                                    resolve(allEventList);
                                } else {
                                    this.getEventList(pageSize, eventFilter.currentPage + 1,
                                        allEventList, sourceId, eventTypes, fromDate, toDate, numberOfRecords, isWithSource)
                                        .then((np) => {
                                            resolve(allEventList);
                                        })
                                        .catch((err) => reject(err));
                                }
                            }
                            eventSub.unsubscribe();
                        } else {
                            eventSub.unsubscribe();
                            reject(resp);
                        }
                    });
            });
    }

    /**
     *
     * @param input Validate Input JSON
     */
    isValidJson(input: any) {
        try {
            if (input) {
                const o = JSON.parse(input);
                if (o && o.constructor === Object) {
                    return o;
                }
            }
        } catch (e) { }
        return false;
    }

    /**
     *
     * check if image is SVG image
     */
    isSVGImage(htmlString: any) {
        if (this.createElementFromHTML(htmlString)) {
            return true;
        }
        return false;
    }
    createElementFromHTML(htmlString: any) {
        const div = document.createElement('div');
        div.innerHTML = htmlString.trim();

        // find and return svg node
        return div.querySelector('svg');
    }

}
