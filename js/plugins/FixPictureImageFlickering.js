//=============================================================================
// FixPictureImageFlickering.js
//=============================================================================
// Copyright (c) 2017 Thirop
// Released under the MIT license
// http://opensource.org/licenses/mit-license.php
//============================================================================= 

//=============================================================================
/*:
 * @plugindesc ピクチャの画像変更時のチラつきを抑制
 * @author シロップ
 * 
 * @help
 * ピクチャの画像変更時に、次の画像の読み込みが終わってから
 * 画像を切り替えることでチラつきを抑えます。
 *
 * 読み込み(画像切替)までにかかる時間が遅い場合は従来どおり、
 * 事前にピクチャを透明度０で表示するなどして事前ロードしてください。
 *
 * 【更新履歴】
 * 1.00 2018/11/23 初版
 */
//=============================================================================



(function(){
'use strict';

var _Sprite_Picture_loadBitmap = Sprite_Picture.prototype.loadBitmap;
Sprite_Picture.prototype.loadBitmap = function() {
    var oldBitmap = this.bitmap;

    _Sprite_Picture_loadBitmap.call(this);

    var bitmap = ImageManager.loadPicture(this._pictureName);
    if(!!oldBitmap && !this.bitmap.isReady()){
        var loadingBitmap = this.bitmap;
        this.bitmap = oldBitmap;

        loadingBitmap.addLoadListener(function(pictureName,bitmap){
            if(this._pictureName === pictureName){
                this.bitmap = bitmap;
            }
        }.bind(this,this._pictureName));
    }
};

})();