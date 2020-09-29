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
import { DeclareFunctionStmt } from '@angular/compiler';

@Injectable()
export class HeatLayerService {

    /**
     * Extension for Leaflet for HeatMap as service
     * Initiazie in component to access heatmap extended pluging
     */
    public initHeatLayer(L: any) {
        L.HeatLayer = (L.Layer ? L.Layer : L.Class).extend({

            // options: {
            //     minOpacity: 0.05,
            //     maxZoom: 18,
            //     radius: 25,
            //     blur: 15,
            //     max: 1.0
            // },

            initialize(latlngs, options) {
                this._latlngs = latlngs;
                L.setOptions(this, options);
            },

            setLatLngs(latlngs) {
                this._latlngs = latlngs;
                return this.redraw();
            },

            addLatLng(latlng) {
                this._latlngs.push(latlng);
                return this.redraw();
            },

            setOptions(options) {
                L.setOptions(this, options);
                if (this._heat) {
                    this._updateOptions();
                }
                return this.redraw();
            },

            redraw() {
                if (this._heat && !this._frame && this._map && !this._map._animating) {
                    this._frame = L.Util.requestAnimFrame(this._redraw, this);
                }
                return this;
            },

            onAdd(map) {
                this._map = map;

                if (!this._canvas) {
                    this._initCanvas();
                }

                if (this.options.pane) {
                    this.getPane().appendChild(this._canvas);
                } else {
                    map._panes.overlayPane.appendChild(this._canvas);
                }

                map.on('moveend', this._reset, this);

                if (map.options.zoomAnimation && L.Browser.any3d) {
                    map.on('zoomanim', this._animateZoom, this);
                }

                this._reset();
            },

            onRemove(map) {
                if (this.options.pane) {
                    this.getPane().removeChild(this._canvas);
                } else {
                    map.getPanes().overlayPane.removeChild(this._canvas);
                }

                map.off('moveend', this._reset, this);

                if (map.options.zoomAnimation) {
                    map.off('zoomanim', this._animateZoom, this);
                }
            },

            addTo(map) {
                map.addLayer(this);
                return this;
            },

            _initCanvas() {
                const canvas = this._canvas = L.DomUtil.create('canvas', 'leaflet-heatmap-layer leaflet-layer');

                const originProp = L.DomUtil.testProp(['transformOrigin', 'WebkitTransformOrigin', 'msTransformOrigin']);
                canvas.style[originProp] = '50% 50%';

                const size = this._map.getSize();
                canvas.width = size.x;
                canvas.height = size.y;

                const animated = this._map.options.zoomAnimation && L.Browser.any3d;
                L.DomUtil.addClass(canvas, 'leaflet-zoom-' + (animated ? 'animated' : 'hide'));

                this._heat = simpleheat(canvas);
                this._updateOptions();
            },

            _updateOptions() {
                this._heat.radius(this.options.radius || this._heat.defaultRadius, this.options.blur);

                if (this.options.gradient) {
                    this._heat.gradient(this.options.gradient);
                }
                if (this.options.max) {
                    this._heat.max(this.options.max);
                }
            },

            _reset() {
                const topLeft = this._map.containerPointToLayerPoint([0, 0]);
                L.DomUtil.setPosition(this._canvas, topLeft);

                const size = this._map.getSize();

                if (this._heat._width !== size.x) {
                    this._canvas.width = this._heat._width = size.x;
                }
                if (this._heat._height !== size.y) {
                    this._canvas.height = this._heat._height = size.y;
                }

                this._redraw();
            },

            _redraw() {
                if (!this._map) {
                    return;
                }

                // tslint:disable-next-line: prefer-const
                let data = [];
                const r = this._heat._r;
                const size = this._map.getSize();
                const bounds = new L.Bounds(
                        L.point([-r, -r]),
                        size.add([r, r]));

                const max = this.options.max === undefined ? 1 : this.options.max;
                const    maxZoom = this.options.maxZoom === undefined ? this._map.getMaxZoom() : this.options.maxZoom;
                const    v = 1 / Math.pow(2, Math.max(0, Math.min(maxZoom - this._map.getZoom(), 12)));
                const    cellSize = r / 2;
                const    grid = [];
                const    panePos = this._map._getMapPanePos();
                const    offsetX = panePos.x % cellSize;
                const    offsetY = panePos.y % cellSize;

                // tslint:disable-next-line: one-variable-per-declaration
                let   i, len, p, cell, x, y, j, len2, k;

                // console.time('process');
                for (i = 0, len = this._latlngs.length; i < len; i++) {
                    p = this._map.latLngToContainerPoint(this._latlngs[i]);
                    if (bounds.contains(p)) {
                        x = Math.floor((p.x - offsetX) / cellSize) + 2;
                        y = Math.floor((p.y - offsetY) / cellSize) + 2;

                        const alt =
                            this._latlngs[i].alt !== undefined ? this._latlngs[i].alt :
                                this._latlngs[i][2] !== undefined ? +this._latlngs[i][2] : 1;
                        k = alt * v;

                        grid[y] = grid[y] || [];
                        cell = grid[y][x];

                        if (!cell) {
                            grid[y][x] = [p.x, p.y, k];

                        } else {
                            cell[0] = (cell[0] * cell[2] + p.x * k) / (cell[2] + k); // x
                            cell[1] = (cell[1] * cell[2] + p.y * k) / (cell[2] + k); // y
                            cell[2] += k; // cumulated intensity value
                        }
                    }
                }

                for (i = 0, len = grid.length; i < len; i++) {
                    if (grid[i]) {
                        for (j = 0, len2 = grid[i].length; j < len2; j++) {
                            cell = grid[i][j];
                            if (cell) {
                                data.push([
                                    Math.round(cell[0]),
                                    Math.round(cell[1]),
                                    Math.min(cell[2], max)
                                ]);
                            }
                        }
                    }
                }
                // console.timeEnd('process');

                // console.time('draw ' + data.length);
                this._heat.data(data).draw(this.options.minOpacity);
                // console.timeEnd('draw ' + data.length);

                this._frame = null;
            },

            _animateZoom(e) {
                const scale = this._map.getZoomScale(e.zoom);
                const offset = this._map._getCenterOffset(e.center)._multiplyBy(-scale).subtract(this._map._getMapPanePos());

                if (L.DomUtil.setTransform) {
                    L.DomUtil.setTransform(this._canvas, offset, scale);

                } else {
                    this._canvas.style[L.DomUtil.TRANSFORM] = L.DomUtil.getTranslateString(offset) + ' scale(' + scale + ')';
                }
            }
        });

        // tslint:disable-next-line: only-arrow-functions
        L.heatLayer = function(latlngs, options) {
            return new L.HeatLayer(latlngs, options);
        };
    }
}

// if (typeof module !== 'undefined') { module.exports = simpleheat; }

function simpleheat(canvas): void {
    if (!(this instanceof simpleheat)) { return new simpleheat(canvas); }

    this._canvas = canvas = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;

    this._ctx = canvas.getContext('2d');
    this._width = canvas.width;
    this._height = canvas.height;

    this._max = 1;
    this._data = [];
}

simpleheat.prototype = {

    defaultRadius: 25,

    defaultGradient: {
        0.4: 'blue',
        0.6: 'cyan',
        0.7: 'lime',
        0.8: 'yellow',
        1.0: 'red'
    },

    data(data) {
        this._data = data;
        return this;
    },

    max(max) {
        this._max = max;
        return this;
    },

    add(point) {
        this._data.push(point);
        return this;
    },

    clear() {
        this._data = [];
        return this;
    },

    radius(r, blur) {
        blur = blur === undefined ? 15 : blur;

        // create a grayscale blurred circle image that we'll use for drawing points
        const circle = this._circle = this._createCanvas();
        const ctx = circle.getContext('2d');
        const r2 = this._r = r + blur;

        circle.width = circle.height = r2 * 2;

        ctx.shadowOffsetX = ctx.shadowOffsetY = r2 * 2;
        ctx.shadowBlur = blur;
        ctx.shadowColor = 'black';

        ctx.beginPath();
        ctx.arc(-r2, -r2, r, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();

        return this;
    },

    resize() {
        this._width = this._canvas.width;
        this._height = this._canvas.height;
    },

    gradient(grad) {
        // create a 256x1 gradient that we'll use to turn a grayscale heatmap into a colored one
        const canvas = this._createCanvas();
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 256);

        canvas.width = 1;
        canvas.height = 256;

        // tslint:disable-next-line: forin
        for (const i in grad) {
            gradient.addColorStop(+i, grad[i]);
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1, 256);

        this._grad = ctx.getImageData(0, 0, 1, 256).data;

        return this;
    },

    draw(minOpacity) {
        if (!this._circle) { this.radius(this.defaultRadius); }
        if (!this._grad) { this.gradient(this.defaultGradient); }

        const ctx = this._ctx;

        ctx.clearRect(0, 0, this._width, this._height);

        // draw a grayscale heatmap by putting a blurred circle at each data point
        for (let i = 0, len = this._data.length, p; i < len; i++) {
            p = this._data[i];
            ctx.globalAlpha = Math.min(Math.max(p[2] / this._max, minOpacity === undefined ? 0.05 : minOpacity), 1);
            ctx.drawImage(this._circle, p[0] - this._r, p[1] - this._r);
        }

        // colorize the heatmap, using opacity value of each pixel to get the right color from our gradient
        const colored = ctx.getImageData(0, 0, this._width, this._height);
        this._colorize(colored.data, this._grad);
        ctx.putImageData(colored, 0, 0);

        return this;
    },

    _colorize(pixels, gradient) {
        for (let i = 0, len = pixels.length, j; i < len; i += 4) {
            j = pixels[i + 3] * 4; // get gradient color from opacity value

            if (j) {
                pixels[i] = gradient[j];
                pixels[i + 1] = gradient[j + 1];
                pixels[i + 2] = gradient[j + 2];
            }
        }
    },

    _createCanvas() {
        if (typeof document !== 'undefined') {
            return document.createElement('canvas');
        } else {
            // create a new canvas instance in node.js
            // the canvas class needs to have a default constructor without any parameter
            return new this._canvas.constructor();
        }
    }
};

