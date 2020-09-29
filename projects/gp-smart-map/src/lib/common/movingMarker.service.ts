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
import { Injectable } from '@angular/core';

@Injectable()
export class MovingMarkerService {

    /**
     * Moving marker plugin is used to show moving animation when devices are moved from one location to another
     */
 initializeMovingMarker(L: any) {
     // tslint:disable-next-line: only-arrow-functions
     L.interpolatePosition = function(p1, p2, duration, t) {
         let k = t / duration;
         k = (k > 0) ? k : 0;
         k = (k > 1) ? 1 : k;
         return L.latLng(p1.lat + k * (p2.lat - p1.lat),
             p1.lng + k * (p2.lng - p1.lng));
     };

     L.Marker.MovingMarker = L.Marker.extend({

         // state constants
         statics: {
             notStartedState: 0,
             endedState: 1,
             pausedState: 2,
             runState: 3
         },

         options: {
             autostart: false,
             loop: false,
         },

         // tslint:disable-next-line: object-literal-shorthand
         initialize: function(latlngs, durations, options) {
             L.Marker.prototype.initialize.call(this, latlngs[0], options);

             // tslint:disable-next-line: only-arrow-functions
             this._latlngs = latlngs.map(function(e, index) {
                 return L.latLng(e);
             });

             if (durations instanceof Array) {
                 this._durations = durations;
             } else {
                 this._durations = this._createDurations(this._latlngs, durations);
             }

             this._currentDuration = 0;
             this._currentIndex = 0;

             this._state = L.Marker.MovingMarker.notStartedState;
             this._startTime = 0;
             this._startTimeStamp = 0;  // timestamp given by requestAnimFrame
             this._pauseStartTime = 0;
             this._animId = 0;
             this._animRequested = false;
             this._currentLine = [];
             this._stations = {};
         },

         // tslint:disable-next-line: object-literal-shorthand
         isRunning: function() {
             return this._state === L.Marker.MovingMarker.runState;
         },

         isEnded() {
             return this._state === L.Marker.MovingMarker.endedState;
         },

         isStarted() {
             return this._state !== L.Marker.MovingMarker.notStartedState;
         },

         isPaused() {
             return this._state === L.Marker.MovingMarker.pausedState;
         },

         start() {
             if (this.isRunning()) {
                 return;
             }

             if (this.isPaused()) {
                 this.resume();
             } else {
                 this._loadLine(0);
                 this._startAnimation();
                 this.fire('start');
             }
         },

         resume() {
             if (!this.isPaused()) {
                 return;
             }
             // update the current line
             this._currentLine[0] = this.getLatLng();
             this._currentDuration -= (this._pauseStartTime - this._startTime);
             this._startAnimation();
         },

         pause() {
             if (!this.isRunning()) {
                 return;
             }

             this._pauseStartTime = Date.now();
             this._state = L.Marker.MovingMarker.pausedState;
             this._stopAnimation();
             this._updatePosition();
         },

         stop(elapsedTime) {
             if (this.isEnded()) {
                 return;
             }

             this._stopAnimation();

             if (typeof (elapsedTime) === 'undefined') {
                 // user call
                 elapsedTime = 0;
                 this._updatePosition();
             }

             this._state = L.Marker.MovingMarker.endedState;
             this.fire('end', { elapsedTime });
         },

         addLatLng(latlng, duration) {
             this._latlngs.push(L.latLng(latlng));
             this._durations.push(duration);
         },

         moveTo(latlng, duration) {
             this._stopAnimation();
             this._latlngs = [this.getLatLng(), L.latLng(latlng)];
             this._durations = [duration];
             this._state = L.Marker.MovingMarker.notStartedState;
             this.start();
             this.options.loop = false;
         },

         addStation(pointIndex, duration) {
             if (pointIndex > this._latlngs.length - 2 || pointIndex < 1) {
                 return;
             }
             this._stations[pointIndex] = duration;
         },

         onAdd(map) {
             L.Marker.prototype.onAdd.call(this, map);

             if (this.options.autostart && (!this.isStarted())) {
                 this.start();
                 return;
             }

             if (this.isRunning()) {
                 this._resumeAnimation();
             }
         },

         onRemove(map) {
             L.Marker.prototype.onRemove.call(this, map);
             this._stopAnimation();
         },

         _createDurations(latlngs, duration) {
             const lastIndex = latlngs.length - 1;
             const distances = [];
             let totalDistance = 0;
             let distance = 0;

             // compute array of distances between points
             for (let i = 0; i < lastIndex; i++) {
                 distance = latlngs[i + 1].distanceTo(latlngs[i]);
                 distances.push(distance);
                 totalDistance += distance;
             }

             const ratioDuration = duration / totalDistance;

             const durations = [];
             // tslint:disable-next-line: prefer-for-of
             for (let i = 0; i < distances.length; i++) {
                 durations.push(distances[i] * ratioDuration);
             }

             return durations;
         },

         _startAnimation() {
             this._state = L.Marker.MovingMarker.runState;
             this._animId = L.Util.requestAnimFrame(function(timestamp) {
                 this._startTime = Date.now();
                 this._startTimeStamp = timestamp;
                 this._animate(timestamp);
             }, this, true);
             this._animRequested = true;
         },

         _resumeAnimation() {
             if (!this._animRequested) {
                 this._animRequested = true;
                 this._animId = L.Util.requestAnimFrame(function(timestamp) {
                     this._animate(timestamp);
                 }, this, true);
             }
         },

         _stopAnimation() {
             if (this._animRequested) {
                 L.Util.cancelAnimFrame(this._animId);
                 this._animRequested = false;
             }
         },

         _updatePosition() {
             const elapsedTime = Date.now() - this._startTime;
             this._animate(this._startTimeStamp + elapsedTime, true);
         },

         _loadLine(index) {
             this._currentIndex = index;
             this._currentDuration = this._durations[index];
             this._currentLine = this._latlngs.slice(index, index + 2);
         },

         /**
          * Load the line where the marker is
          * elapsed time on the current line or null if
          * we reached the end or marker is at a station
          */
         _updateLine(timestamp) {
             // time elapsed since the last latlng
             let elapsedTime = timestamp - this._startTimeStamp;

             // not enough time to update the line
             if (elapsedTime <= this._currentDuration) {
                 return elapsedTime;
             }

             let lineIndex = this._currentIndex;
             let lineDuration = this._currentDuration;
             let stationDuration;

             while (elapsedTime > lineDuration) {
                 // substract time of the current line
                 elapsedTime -= lineDuration;
                 stationDuration = this._stations[lineIndex + 1];

                 // test if there is a station at the end of the line
                 if (stationDuration !== undefined) {
                     if (elapsedTime < stationDuration) {
                         this.setLatLng(this._latlngs[lineIndex + 1]);
                         return null;
                     }
                     elapsedTime -= stationDuration;
                 }

                 lineIndex++;

                 // test if we have reached the end of the polyline
                 if (lineIndex >= this._latlngs.length - 1) {

                     if (this.options.loop) {
                         lineIndex = 0;
                         this.fire('loop', { elapsedTime });
                     } else {
                         // place the marker at the end, else it would be at
                         // the last position
                         this.setLatLng(this._latlngs[this._latlngs.length - 1]);
                         this.stop(elapsedTime);
                         return null;
                     }
                 }
                 lineDuration = this._durations[lineIndex];
             }

             this._loadLine(lineIndex);
             this._startTimeStamp = timestamp - elapsedTime;
             this._startTime = Date.now() - elapsedTime;
             return elapsedTime;
         },

         _animate(timestamp, noRequestAnim) {
             this._animRequested = false;

             // find the next line and compute the new elapsedTime
             const elapsedTime = this._updateLine(timestamp);

             if (this.isEnded()) {
                 // no need to animate
                 return;
             }

             if (elapsedTime != null) {
                 // compute the position
                 const p = L.interpolatePosition(this._currentLine[0],
                     this._currentLine[1],
                     this._currentDuration,
                     elapsedTime);
                 this.setLatLng(p);
             }

             if (!noRequestAnim) {
                 this._animId = L.Util.requestAnimFrame(this._animate, this, false);
                 this._animRequested = true;
             }
         }
     });

     // tslint:disable-next-line: only-arrow-functions
     L.Marker.movingMarker = function(latlngs, duration, options) {
         return new L.Marker.MovingMarker(latlngs, duration, options);
     };
 }
}
