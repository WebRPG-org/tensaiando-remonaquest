/*:
 * @plugindesc 右端をUI領域として確保し、スイッチに応じて画像を切り替え表示する軽量版（ピクチャを前面表示可能）
 * @author ChatGPT
 *
 * @param HideWidth
 * @text 非表示幅
 * @type number
 * @min 0
 * @default 450
 *
 * @param ImageSettings
 * @text スイッチ画像設定
 * @type struct<SwitchImage>[]
 * @default []
 *
 * @help
 * 右端の一定幅をUI領域として確保し、マップ表示を左寄せします。
 * さらに、指定スイッチがONのときに、右端へ指定画像を表示します。
 *
 * ■画像について
 * - 画像は img/pictures/ に入れてください
 * - 拡張子は不要です
 *
 * ■動作仕様
 * - 複数のスイッチ＋画像を登録できます
 * - ONになっているもののうち、登録順で最後の設定を優先して表示します
 * - どのスイッチもONでない場合は何も表示しません
 * - このプラグインの画像は「ピクチャより下」に表示されます
 * - そのため、イベントコマンドのピクチャ表示で上に重ねられます
 *
 * ■注意
 * - 右側の領域にも内部的にはマップは描画されていますが、
 *   その上に画像を重ねて見えなくしています
 * - 低スペック端末向けに mask は使っていません
 *
 * ■利用例
 * 1. スイッチ10 → Face_A
 * 2. スイッチ11 → Face_B
 * 3. スイッチ12 → Face_C
 */

/*~struct~SwitchImage:
 * @param SwitchId
 * @text スイッチ番号
 * @type switch
 * @default 1
 *
 * @param ImageName
 * @text 画像ファイル名
 * @type file
 * @dir img/pictures/
 * @default
 */

(function() {
    "use strict";

    var pluginName = "RightMapMargin";
    var parameters = PluginManager.parameters(pluginName);

    var HIDE_WIDTH = Number(parameters["HideWidth"] || 450);

    function parseStructArray(data) {
        if (!data) return [];
        try {
            var arr = JSON.parse(data);
            return arr.map(function(item) {
                var obj = JSON.parse(item);
                return {
                    switchId: Number(obj.SwitchId || 0),
                    imageName: String(obj.ImageName || "")
                };
            });
        } catch (e) {
            console.error(pluginName + ": パラメータ解析エラー", e);
            return [];
        }
    }

    var IMAGE_SETTINGS = parseStructArray(parameters["ImageSettings"]);

    function getCurrentImageName() {
        var result = "";
        for (var i = 0; i < IMAGE_SETTINGS.length; i++) {
            var setting = IMAGE_SETTINGS[i];
            if (setting.switchId > 0 && setting.imageName && $gameSwitches.value(setting.switchId)) {
                result = setting.imageName;
            }
        }
        return result;
    }

    // 画面上の見える領域を左側に寄せる
    Game_Player.prototype.centerX = function() {
        var visibleWidth = Math.max(0, Graphics.width - HIDE_WIDTH);
        return (visibleWidth / $gameMap.tileWidth() - 1) / 2.0;
    };

    // Spriteset_Map 内に追加することで、ピクチャより下に表示する
    var _Spriteset_Map_createUpperLayer = Spriteset_Map.prototype.createUpperLayer;
    Spriteset_Map.prototype.createUpperLayer = function() {
        this.createRightMarginImageSprite();
        _Spriteset_Map_createUpperLayer.call(this);
    };

    Spriteset_Map.prototype.createRightMarginImageSprite = function() {
        this._rightMarginSprite = new Sprite();
        this._rightMarginSprite.x = Graphics.width - HIDE_WIDTH;
        this._rightMarginSprite.y = 0;
        this._rightMarginSprite.visible = false;
        this._rightMarginCurrentName = "";

        // _baseSprite に入れることで、マップより前・ピクチャより後ろではなく
        // 「ピクチャより下」に配置される
        this._baseSprite.addChild(this._rightMarginSprite);
    };

    Spriteset_Map.prototype.refreshRightMarginImage = function() {
        if (!this._rightMarginSprite) return;

        var imageName = getCurrentImageName();
        if (this._rightMarginCurrentName === imageName) {
            return;
        }

        this._rightMarginCurrentName = imageName;

        if (imageName) {
            this._rightMarginSprite.bitmap = ImageManager.loadPicture(imageName);
            this._rightMarginSprite.visible = true;
        } else {
            this._rightMarginSprite.bitmap = null;
            this._rightMarginSprite.visible = false;
        }
    };

    var _Spriteset_Map_update = Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update = function() {
        _Spriteset_Map_update.call(this);
        this.refreshRightMarginImage();
    };

})();