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
export class ImageRotateService {
    /**
     * Image Rotate service used to fix rotation on image based on smart map config settings
     */
    initialize(L: any) {
        L.ImageOverlay.Rotated = L.ImageOverlay.extend({

            initialize(image, topleft, topright, bottomleft, options) {

                if (typeof (image) === 'string') {
                    this._url = image;
                } else {
                    // Assume that the first parameter is an instance of HTMLImage or HTMLCanvas
                    this._rawImage = image;
                }

                this._topLeft = L.latLng(topleft);
                this._topRight = L.latLng(topright);
                this._bottomLeft = L.latLng(bottomleft);
                this._bottomRight = null;
                L.setOptions(this, options);
            },


            onAdd(map) {
                if (!this._image) {
                    this._initImage();

                    if (this.options.opacity < 1) {
                        this._updateOpacity();
                    }
                }

                if (this.options.interactive) {
                    L.DomUtil.addClass(this._rawImage, 'leaflet-interactive');
                    this.addInteractiveTarget(this._rawImage);
                }

                map.on('zoomend resetview', this._reset, this);

                this.getPane().appendChild(this._image);
                this._reset();
            },


            onRemove(map) {
                map.off('zoomend resetview', this._reset, this);
                L.ImageOverlay.prototype.onRemove.call(this, map);
            },


            _initImage() {
                let img = this._rawImage;
                if (this._url) {
                    img = L.DomUtil.create('img');
                    img.style.display = 'none';	// Hide while the first transform (zero or one frames) is being done

                    if (this.options.crossOrigin) {
                        img.crossOrigin = '';
                    }

                    img.src = this._url;
                    this._rawImage = img;
                }
                L.DomUtil.addClass(img, 'leaflet-image-layer');

                // this._image is reused by some of the methods of the parent class and
                // must keep the name, even if it is counter-intuitive.
                const div = this._image = L.DomUtil.create('div',
                    'leaflet-image-layer ' + (this._zoomAnimated ? 'leaflet-zoom-animated' : ''));

                this._updateZIndex(); // apply z-index style setting to the div (if defined)

                div.appendChild(img);

                div.onselectstart = L.Util.falseFn;
                div.onmousemove = L.Util.falseFn;

                img.onload = function() {
                    this._reset();
                    img.style.display = 'block';
                    this.fire('load');
                }.bind(this);

                img.alt = this.options.alt;
            },


            _reset() {
                const div = this._image;

                if (!this._map) {
                    return;
                }

                // Project control points to container-pixel coordinates
                const pxTopLeft = this._map.latLngToLayerPoint(this._topLeft);
                const pxTopRight = this._map.latLngToLayerPoint(this._topRight);
                const pxBottomLeft = this._map.latLngToLayerPoint(this._bottomLeft);

                // Infer coordinate of bottom right
                const pxBottomRight = pxTopRight.subtract(pxTopLeft).add(pxBottomLeft);

                this._bottomRight = this._map.layerPointToLatLng(pxBottomRight);

                // pxBounds is mostly for positioning the <div> container
                const pxBounds = L.bounds([pxTopLeft, pxTopRight, pxBottomLeft, pxBottomRight]);
                const size = pxBounds.getSize();
                const pxTopLeftInDiv = pxTopLeft.subtract(pxBounds.min);

                // LatLngBounds are needed for (zoom) animations
                this._bounds = L.latLngBounds(this._map.layerPointToLatLng(pxBounds.min),
                    this._map.layerPointToLatLng(pxBounds.max));

                L.DomUtil.setPosition(div, pxBounds.min);

                div.style.width = size.x + 'px';
                div.style.height = size.y + 'px';

                const imgW = this._rawImage.width;
                const imgH = this._rawImage.height;
                if (!imgW || !imgH) {
                    return;	// Probably because the image hasn't loaded yet.
                }

                // Sides of the control-point box, in pixels
                // These are the main ingredient for the transformation matrix.
                const vectorX = pxTopRight.subtract(pxTopLeft);
                const vectorY = pxBottomLeft.subtract(pxTopLeft);

                this._rawImage.style.transformOrigin = '0 0';

                // The transformation is an affine matrix that switches
                // coordinates around in just the right way. This is the result
                // of calculating the skew/rotation/scale matrices and simplyfing
                // everything.
                this._rawImage.style.transform = 'matrix(' +
                    (vectorX.x / imgW) + ', ' + (vectorX.y / imgW) + ', ' +
                    (vectorY.x / imgH) + ', ' + (vectorY.y / imgH) + ', ' +
                    pxTopLeftInDiv.x + ', ' + pxTopLeftInDiv.y + ')';

            },


            reposition(topleft, topright, bottomleft) {
                this._topLeft = L.latLng(topleft);
                this._topRight = L.latLng(topright);
                this._bottomLeft = L.latLng(bottomleft);
                this._reset();
            },

            getImageBound() {
                return [this._topLeft, this._topRight, this._bottomLeft, this._bottomRight];
            },

            setUrl(url) {
                this._url = url;

                if (this._rawImage) {
                    this._rawImage.src = url;
                }
                return this;
            }
        });

        // tslint:disable-next-line: only-arrow-functions
        L.imageOverlay.rotated = function(imgSrc, topleft, topright, bottomleft, options) {
            return new L.ImageOverlay.Rotated(imgSrc, topleft, topright, bottomleft, options);
        };
    }
}
