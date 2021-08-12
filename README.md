
# Smart Map Widget for Cumulocity[<img width="35" src="https://user-images.githubusercontent.com/67993842/97668428-f360cc80-1aa7-11eb-8801-da578bda4334.png"/>](https://github.com/SoftwareAG/cumulocity-smart-map-widget/releases/download/1.0.4/smartmap-runtime-widget-1.0.4.zip)

  

  

The Smart Map widget help you to track real-time device locations in indoor with multi floor infrastructure as well as in outdoor.

  

  


  

  

![](https://user-images.githubusercontent.com/32765455/94537868-f5452f00-0260-11eb-830e-e103546d9567.png)

    

## What's new?

  
  

*  **Heat Map:** Real time Indoor and outdoor Heat Map based on last location event.

  
  

*  **Cluster Map:** Indoor and outdoor cluster map to show case real time device tracking.

  
  

*  **Geo-fences and Smart Rule:** Configure and fire smart rules based on geo-fences for indoor and outdoor devices.

  
  
  
*  **SVG and GeoJSON Support:**  Now Smart Map supports SVG and GeoJSON file format.

  


  
*  **Navigation from Map:**   Dashboard navigation directly from map (Available only in Application Builder).

  
  
  
  

*  **Smart Configuration - More Control:** Now User can control Indoor Zoom, Outdoor Zoom, Heat intensity and much more during smart map configuration.

    
  

## Features

  
*  **Heat Map:** Location event based real time Heat Map for Indoor as well as for Outdoor devices.

  
  

*  **Historical Heat Map:** Build Heat Map for indoor or outdoor based on historical data.

  
  

*  **Hybrid Map:** An unique map for real time tracking of your device in indoor as well as outdoor.

  
  
  

*  **Support single device and group devices:** Based on configuration during widget configuration.

  

  

*  **Support Indoor Infrastructure settings :** Beacons, Cameras, Tags and Devices (Applicable for Indoor Map only).

  

  

*  **Support Multiple floors :** Based on Altitude settings in device manage objects.




*  **Smart Configuration:** Simplified configuration options based on map type.


  

*  **[Smart Map Settings](https://github.com/SoftwareAG/cumulocity-smart-map-settings-widget):** Configure multiple floor plans with live preview.

  

  

*  **Follow Device:** Unique Feature to follow/track your single device when device move from one floor to another floor.

  

  

*  **Display Modes:** show/hide devices/infrastructure on indoor map.

  

  

  

## Installation

  
### Runtime Widget Deployment?

* This widget support runtime deployment. Download [Runtime Binary](https://github.com/SoftwareAG/cumulocity-smart-map-widget/releases/download/1.0.4/smartmap-runtime-widget-1.0.4.zip) and follow runtime deployment instructions from [here](https://github.com/SoftwareAG/cumulocity-runtime-widget-loader).

### Installation of widget through Appbuilder or Cockipt Deployment?
  

**Supported Cumulocity Environments:**

  

  

*  **App Builder:** Tested with Cumulocity App Builder version 1.2.2.

  

  

*  **Cockpit Application:** Tested with Cockpit 1006.6.8 with [Patch Fix](https://www.npmjs.com/package/cumulocity-runtime-widget-loader).

  

  

**Requirements:**

  

  

* Git

  

  

* NodeJS (release builds are currently built with `v10.19.0`)

  

  

* NPM (Included with NodeJS)

  

  

**External dependencies:**

  

  

```
  
 "angular-resize-event": "^1.1.1" 
 
 "fontawesome": "4.7.2"
 
 "group-array": "^1.0.0"
 
 "leaflet-draw": "^1.0.4"
 
 "leaflet-extra-markers": "^1.2.1"
 
 "leaflet2": "npm:leaflet@^1.6.0"
 
 "@angular/material": "8.2.3"
 
 "ngx-bootstrap": "5.5.0"
 
 "leaflet.markercluster": "^1.4.1"

```

  

  

**Installation Steps For App Builder:**

  

  

**Note:** If you are new to App Builder or not yet downloaded/clone app builder code then please follow [App builder documentation(Build Instructions)](https://github.com/SoftwareAG/cumulocity-app-builder) before proceeding further.

  

  

1. Open Your existing App Builder project and install external dependencies by executing below command or install it manually.


    ```
    npm i angular-resize-event@1.1.1 fontawesome@4.7.2 group-array@1.0.0 leaflet-draw@1.0.4 leaflet-extra-markers@1.2.1 leaflet2@npm:leaflet@^1.6.0 @angular/material@8.2.3 ngx-bootstrap@5.5.0 leaflet.markercluster@1.4.1
    ```


  
2. Install **[Smart Map Settings Widget](https://github.com/SoftwareAG/cumulocity-smart-map-settings-widget)** for indoor configuration.


  

3. Grab the Smart Map **[Latest Release Binary](https://github.com/SoftwareAG/cumulocity-smart-map-widget/releases/download/1.0.4/gp-smart-map-1.0.4.tgz)**.

  

  

4. Install the Binary file in app builder.

  

  

    ```
        
    npm i <binary file path>/gp-smart-map-x.x.x.tgz

    ```

  

  

5. Copy smart-map.css file [from here](https://github.com/SoftwareAG/cumulocity-smart-map-widget/releases/download/1.0.4/smart-map.css) and paste it at /cumulocity-app-builder/ui-assets/


      



6. Open index.less located at /cumulocity-app-builder/ui-assets/

  

  

7. Update index.less file with below Material theme. Import at first line in file/begining of file(Please ignore this step if it already exist).

  
  

    ```

    @import '~@angular/material/prebuilt-themes/indigo-pink.css';

    ```

  

  

8. Update index.less file with below smart-map.css. Import at last line/end of file.

  

  

    ```

    @import 'smart-map.css';    

    ```

  

9. Import SmartMapModule in custom-widget.module.ts file located at /cumulocity-app-builder/custom-widgets/

  

  

    ```

    import {GPSmartMapModule} from 'gp-smart-map';

    @NgModule({    

      imports: [

      GPSmartMapModule

      ]
    })
    
    ```

  

  

10. Congratulation! Installation is now completed. Now you can run app builder locally or build and deploy it into your tenant.

  

  

    ```

    //Start App Builder

    npm run start

    // Build App

    npm run build

    // Deploy App

    npm run deploy

    ```

  

  

**Installation Steps For Cockpit:**

  

  

**Note:** If you are new to Cockpit or not yet created any cockpit application then please follow [Web SDK for Angular](https://cumulocity.com/guides/web/angular/) before proceeding further.

  

  

1. Open Your existing Cockpit/Cumulocity project and install external dependencies by executing below command or install it manually.

  

  

    ```    

    npm i angular-resize-event@1.1.1 fontawesome@4.7.2 group-array@1.0.0 leaflet-draw@1.0.4 leaflet-extra-markers@1.2.1 leaflet2@npm:leaflet@^1.6.0 @angular/material@8.2.3 ngx-bootstrap@5.5.0 leaflet.markercluster@1.4.1

    ```

  

  

2. Install **[Smart Map Settings Widget](https://github.com/SoftwareAG/cumulocity-smart-map-settings-widget)** for indoor configuration.

  

  

3. Grab the Smart Map **[Latest Release Binary](https://github.com/SoftwareAG/cumulocity-smart-map-widget/releases/download/1.0.4/gp-smart-map-1.0.4.tgz)**

  

  

4. Install the Binary file in your project.

  

  

    ```

    npm i <binary file path>/gp-smart-map-x.x.x.tgz

    ```

    

5. Copy smart-map.css file [from here](https://github.com/SoftwareAG/cumulocity-smart-map-widget/releases/download/1.0.4/smart-map.css) and paste it at /cumulocity-app/branding/


     

    

    **Note:** If you don't find branding folder then please follow [Cumulocity Branding](https://cumulocity.com/guides/web/angular/#branding)

  

  

6. Open branding.less located at /cumulocity-app/branding/

  

  

7. Update branding.less file with below Material theme. Import at first line/begining of file(Please ignore this step if it already exist).

  

  

    ```

    @import '~@angular/material/prebuilt-themes/indigo-pink.css';

    ```

  

  

8. Update branding.less file with below smart-map.css. Import at last line/end of file.

  

  

    ```
    @import 'smart-map.css';

    ```

  

9. Import SmartMapModule in app.module.ts file located at /cumulocity-app/

  

  

    ```

    import {GPSmartMapModule} from 'gp-smart-map';

    @NgModule({

      imports: [

      GPSmartMapModule

      ]
    
    })

    ```

  

  

10. Congratulation! Installation is now completed. Now you can run your app locally or build and deploy it into your tenant.

  

  

    ```

    //Start App Builder

    npm run start

    // Build App

    npm run build

    // Deploy App

    npm run deploy

    ```

  

  

## Build Instructions

  

  

**Note:** It is only necessary to follow these instructions if you are modifying/extending this widget, otherwise see the [Installation Guide](#Installation).

  

  

**Requirements:**

  

  

* Git

  

  

* NodeJS (release builds are currently built with `v10.19.0`)

  

  

* NPM (Included with NodeJS)

  

  

**Instructions**

  

  

1. Clone the repository:

  

    ```

    git clone https://github.com/SoftwareAG/cumulocity-smart-map-widget.git

    ```

  

2. Change directory:

  
    ```
    cd cumulocity-smart-map-widget

    ```

  

3. (Optional) Checkout a specific version:

  

    ```
    git checkout <your version>

    ```

  

4. Install the dependencies:

  

    ```
    npm install

    ```

  

5. (Optional) Local development server:

  

    ```
    npm run start

    ```

  

6. Build the app:

  

    ```

    npm run build

    ```

  

7. Deploy the app:

  

    ```
    npm run deploy

    ```

  

  

## QuickStart

  

This guide will teach you how to add widget in your existing or new dashboard.

  

**NOTE:** This guide assumes you have followed the [Installation instructions](#Installation)

  

1. Open you application from App Switcher

  

2. Add new dashboard or navigate to existing dashboard

  

3. Click `Add Widget`

  

4. Search for `Smart Map`

  

5. Select `Target Assets or Devices`

  

7. Click `Save`

  

Congratulations! Smart Map is configured.

  

  

## User Guide

  

  

**Outdoor Map:**

  
  

*  **Target assets or devices:** User can select a device or a group. Based on device/group, list of devices will be display on Map. Only those devices are visible on map where position attributes are configured. Altitude value represent floor number in this map.

  
  
*  **Asset Type:** User can select any Asset Type From Drop down. This asset types will be populated from Smart-Map-Settings widget where user has ability to create asset type and tag it with indoor floor plan or geo-fences. Based on selected asset type, corresponding asset(s) will be loaded on Smart Map.



* **Dashboard Field(Application Builder only):** User has ability to provide device object field which represent dashboard Id. Based on this field, smart map will display navigation link for particular device.
  
  

* **TabGroup Field(Application Builder only):** User has ability to provide device object field which represent dashboard tab group name. Based on this field, smart map will display navigation link for particular device.


**Indoor Map:**

  
  

*  **Target assets or devices:** Same as outdoor Map.

  
  

*  **Asset Type:** Same as outdoor Map.
  
  

*  **Infra Group ID:** This group should have devices which are represent infrastructure of building/floor plan such as Camera, Tag, Beacon. Smart map support Camera, Tag and Beacon and identify by device type field in device object. (Please make sure that device type field must contains keyword either 'Camera', 'Tag' or 'Beacon'. For example c8y_assetTag, c8y_beacon, c8y_camera).

  

*  **Display Mode:** User has ability to select only devices(live tracker), only infrastructure devices(beacon,tag, etc) or both. Based on selection, devices will be display on map.

  
* **Dashboard Field(Application Builder only):** Same as outdoor Map.
  
  

* **TabGroup Field(Application Builder only):**  Same as outdoor Map.



**Hybrid Map:**

  

*  **Scenario:** Hybrid Map is a unique combination of Indoor and outdoor tracking for a particular device or asset. Here selection of target assets/devices represent a asset which have two child devices which will represent indoor tracker device and outdoor tracker device. Indoor tracker device will get activated as soon as it will come in proximity of a beacon which is located as part of infrastructure of a building. If indoor tracker device not received any location event for certain time period(time period is calculated based on location event received in recent past) then Smart Map will automatically switch to outdoor tracker and display the location based on outdoor tracker.

  

*  **Target assets or devices:** Same as Outdoor Map. In Hybrid Map, it is recommended to select single asset or group which have single asset and asset should have two child devices(Indoor tracker and outdoor tracker).

  

*  **Asset Type:** Same as  outdoor Map.

  
  

*  **Infra Group ID:** Same as Indoor Map.

  
  

*  **Display Mode:** Same as Indoor Map.

  

*  **Indoor Tracker ID:** This is indoor tracker device id which must be child device of a asset. If not provided then outdoor tracker will be used for asset tracking.

  

*  **Outdoor Tracker ID:** This is outdoor tracker device id which must be child device of a asset. If not provided, then asset's location will be used for tracking.

  
  

*  **Location Event Type(s):** One more location event types separated by comma. Default : "c8y_LocationUpdate"


  
* **Dashboard Field(Application Builder only):** Same as outdoor Map.
  
  

* **TabGroup Field(Application Builder only):**  Same as outdoor Map.  
  


**Heat Map/ Indoor Heat Map:**

  

*  **Target assets or devices:** Same as Outdoor Map. In Heat Map, device(s) are used to capture location events. Please note that Heat Map is not floor specific.

  

*  **Asset Type:** Same as outdoor Map(Applicable for Indoor Heat Map only).

  
  

*  **Location Event Type(s):** Same as Hybrid Map.

  
  

*  **HeatMap Event Quantity:** If custom location event have any field which can represent intensity/count of events then user can provide it. by default system will auto calculate intensity for heat map.

  
  
*  **HeatMap Intensity Legends:**  User has ability to provide custom legends for Low, Medium and High Intensity.



**Cluster Map/ Indoor Cluster Map:**


*  **Target assets or devices:** Same as outdoor Map.


*  **Asset Type:** Same as  outdoor Map(applicable only for Indoor Cluster Map).

  
* **Dashboard Field(Application Builder only):** Same as outdoor Map.
  
  

* **TabGroup Field(Application Builder only):**  Same as outdoor Map.


**Advance Configuration:**


  

*  **Follow Device:** Switch on to follow/track your single device when device move from one floor to another floor.

  

*  **Geofence:**  Switch on to see geofence option on Smart Map(Subject to geofence configuration in smart map configuration widget).

  
*  **Include Child Device:** Switch on to include/consider child device to display instead of parent device based on active location event/tracking. Not applicable for Hybrid map.

  
*  **Heat Map Last Event Only:** Switch on to display map based on last location event.  As soon as new event comes for same device, existing event location will be removed from map.


*  **Default Zoom:**  User has ability to change outdoor zoom level. Default is Auto.


*  **Default Indoor Zoom:**   User has ability to change indoor zoom level. Default is Auto.
 


*  **Heat Map Event Intensity:**  User has ability to change location event intensity for Heat  Map. Default is Auto.


	**Note:** Advance configuration options are map type specific.




**Smart Map On Screen Options:**

  

  

*  **Realtime**: Realtime tracking is activated by default. Use can click on it to on/off real time tracking of device(s).

  
  

*  **Reload**: Useful for force reload/refresh map.

  

  

*  **Active Tracker**: Indicator for user about active tracker(Indoor/Outdoor). Available only for Hybrid Map.

  

*  **Date Range Filter**: Date range filter to generate heat map based on historical events. Available only for Heat Map when Real time is off.

  

  

## Troubleshooting

  

  

*  **Floor Plan not loaded:**

  

  

    * Verify that your device is located on floor plan.

    

    

    * Check and verify smart-map-settings widget for exact geo coordinates.

    

    

    * Check in browser console for any content security violation error. If any content violation error present then update content security policy in your app. Content security policy located in package.json file in your app. You can compare and update as per below example:

  

  

```  

"contentSecurityPolicy": "base-uri 'none'; default-src 'self' 'unsafe-inline' http: https: ws: wss:; connect-src 'self' *.billwerk.com http: https: ws: wss:; script-src 'self' open.mapquestapi.com *.twitter.com *.twimg.com 'unsafe-inline' 'unsafe-eval' data:; style-src * 'unsafe-inline' blob:; img-src * data: blob:; font-src * data:; frame-src *;"


```

  

  

------------------------------

  

  

  

This widget is provided as-is and without warranty or support. They do not constitute part of the Software AG product suite. Users are free to use, fork and modify them, subject to the license agreement. While Software AG welcomes contributions, we cannot guarantee to include every contribution in the master project.

  

  

_____________________

  

  

For more information you can Ask a Question in the [TECHcommunity Forums](http://tech.forums.softwareag.com/techjforum/forums/list.page?product=cumulocity).

  

  

  

You can find additional information in the [Software AG TECHcommunity](http://techcommunity.softwareag.com/home/-/product/name/cumulocity).
