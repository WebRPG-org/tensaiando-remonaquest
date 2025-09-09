//=============================================================================
// MapMask.js
//=============================================================================

/*:
 * @plugindesc FC版DQのようなマップにマスクが表示されます。
 * @author 村人C
 *
 * @help
 *
 * 使い方
 * パラメータ：
 * リージョン：
 * ここで設定したリージョンがマスク表示されます。
 *
 * カラー：
 * マスクの表示色です。
 * カラーコード 「CSS Color」等で検索して下さい。
 * 例： 赤色にしたい
 * Red  #FF0000  rgb(255,0,0)
 * どれでも赤色になります。
 *
 * 判定設定：
 * 設定がＯＮの場合、隣接した場合マスクが外れます。
 * ＯＦＦの場合は、足元に来た場合マスクが外れます。
 * 初期値はＯＦＦです。
 *
 * スイッチ：
 * 設定したスイッチがＯＮの時、マスクを無効化します。
 * 初期設定は、使用しない設定になっています。
 *
 * プラグインコマンド：
 * マスクスイッチ 有効
 * 上記で設定したスイッチがＯＮの時でもマスクを表示します。
 *
 * マスクスイッチ 無効
 * 上記で設定したスイッチがＯＮの時、マスクを無効化します。
 *
 * 仕様
 * マスクスイッチは自動で切り替わらないためスイッチ同様、使用したい時に切り替えて下さい。
 * マップサイズが大きい場合、PCやスマホの性能次第で重くなる場合があります。
 *
 * readmeやスタッフロールの明記、使用報告は任意
 *
 * @param マスク設定
 *
 * @param リージョン
 * @parent マスク設定
 * @type string[]
 * @desc マスク専用のリージョンID設定
 * デフォルト: 10,11,12,13,14
 * @default 10,11,12,13,14
 *
 * @param カラー
 * @parent マスク設定
 * @type string
 * @desc カラーコード
 * デフォルト: #000000
 * @default #000000
 *
 * @param 判定設定
 * @parent マスク設定
 * @desc 隣接したらマスクを外す
 * @type boolean
 * @on ON
 * @off OFF
 * デフォルト: on
 * @default false
 *
 * @param スイッチ
 * @parent マスク設定
 * @type switch
 * @default 0
 *
 */
var MapMask = MapMask || {};
MapMask.Parameters = PluginManager.parameters('MapMask');
MapMask.param = []; // コマンド格納用
var value = MapMask.Parameters["リージョン"].split(",")
for (var i in value) {
	value[i] = Number(value[i]);
}
MapMask.param[0] = value || [10,11,12,13,14];
MapMask.param[1] = MapMask.Parameters["カラー"] || "rgb(0,0,0)";
MapMask.param[2] = Number(MapMask.Parameters["スイッチ"]) || 0;
MapMask.param[3] = MapMask.Parameters["判定設定"] === "true";

(function() {
	// プラグインコマンド
    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (command === 'マスクスイッチ') {
			switch (args[0]) {
            case '有効' || 'ON' || 'on':
                $gameSystem._maskSwitch = true; // 判定
                break;
            case '無効' || 'OFF' || 'off':
                $gameSystem._maskSwitch = false; // 判定
                break;
			}
		}
    };
	// オブジェクト初期化
	var _Game_System_initialize = Game_System.prototype.initialize;
	Game_System.prototype.initialize = function() {
		_Game_System_initialize.call(this);
		this._maskSwitch = false; // スイッチ無効化フラグ
		
	};
	// マスクスイッチ
	Game_System.prototype.maskSwitch = function() {
		return this._maskSwitch;
	}
	// セットアップ
	var _Game_Map_setup = Game_Map.prototype.setup;
	Game_Map.prototype.setup = function(mapId) {
		_Game_Map_setup.call(this, mapId);
		this.setupMasks(); // マスクの作成
	};
	// マスクの作成
	Game_Map.prototype.setupMasks = function() {
		this._masks = {}; // 初期化
		for (var x=0; x<this.width(); x++) // 幅の取得
			for (var y=0; y<this.height(); y++) { // 高さの取得
				var region = this.regionId(x, y); // リージョンID
				if (MapMask.param[0].contains(region)) { // 配列にリージョンIDが含まれているか
					if (!this._masks[region]) this._masks[region] = [];
					this._masks[region].push([x, y]); // リージョンIDの座標を格納
				}
		}
	};
	// マスク
	Game_Map.prototype.masks = function() {
		return this._masks;
	}
	// キーの取得
	Game_Map.prototype.getKeys = function(array) {
		var keys = [];
		if (array) {
			for (var key in array) {
				keys.push(key);
			}
		}
		return keys;
	};
	// オブジェクト初期化
	function MaskSprite() {
		this.initialize.apply(this, arguments);
	};
	MaskSprite.prototype = Object.create(Sprite_Base.prototype);
	MaskSprite.prototype.constructor = MaskSprite;
	MaskSprite.prototype.initialize = function(regionId) {
		Sprite_Base.prototype.initialize.call(this);
		this._regionId = Number(regionId); // リージョンID
		this.bitmap = new Bitmap($gameMap.width()*48, $gameMap.height()*48); // Bitmap
		this.drawMask(); // マスクの作成
		return this;
	}
	// マスクの作成
	MaskSprite.prototype.drawMask = function() {
		var pos = $gameMap.masks()[this._regionId]; // 座標
		for (var i in pos) {
			this.bitmap.fillRect(pos[i][0]*48, pos[i][1]*48, 48, 48, MapMask.param[1]); // 矩形
		} 
	};
	// マスクの更新
	MaskSprite.prototype.update = function() {
		if ($gameSystem.maskSwitch() || !$gameSwitches.value(MapMask.param[2])) { // スイッチONなら表示しない
			var x = $gamePlayer.x; // プレイヤー座標X
			var y = $gamePlayer.y; // プレイヤー座標Y
			var realX = $gameMap.displayX(); // 画面X
			var realY = $gameMap.displayY(); // 画面Y
			if (MapMask.param[3]) { // 隣接判定
				var poss = [[x,y],[x+1,y],[x-1,y],[x,y+1],[x,y-1]]; // 検索座標
			} else {
				var poss = [[x,y]]; // 検索座標
			}
			var flag = poss.some(function(pos){ // 検索座標にリージョンが存在するか
				var regionId = Number($gameMap.regionId(pos[0],pos[1]));
				return (this._regionId === regionId); // リージョンIDが一致
			}, this);
			if (flag) { // 一致した
				this.opacity = 0; // 不透明度
			} else { // 一致しない
				this.opacity = 255; // 不透明度
			}
			this.x = -(realX * 48); // X座標
			this.y = -(realY * 48); // Y座標
			this.visible = true; // 表示
		} else {
			this.visible = false; // スイッチONなら表示しない
		}
	};
	// ピクチャスプライトの作成
	var _Spriteset_Map_createPictures = Spriteset_Map.prototype.createPictures;
	Spriteset_Map.prototype.createPictures = function() {
		this.createMasks(); // ピクチャより下に作成
		_Spriteset_Map_createPictures.call(this);
		// ここに移動するとピクチャより上に作成
	};
	// フレーム更新
	var _Spriteset_Map_update = Spriteset_Map.prototype.update;
	Spriteset_Map.prototype.update = function() {
		_Spriteset_Map_update.call(this);
		this.updateMasks();
	};
	// マスクの作成
	Spriteset_Map.prototype.createMasks = function() {
		this._regionMask = []; // 初期化
		var masks = $gameMap.getKeys($gameMap.masks()); // リージョン情報の取得
		if (masks.length > 0) {
			for (var key in masks) { // リージョンIDからスプライトの作成
				var sprite = new MaskSprite(masks[key]);
				this._regionMask.push(sprite); // スプライトの追加
				this.addChild(sprite); // 表示
			}
		}
	};
	// マスクの更新
	Spriteset_Map.prototype.updateMasks = function() {
		for (var id in this._regionMask) {
			this._regionMask[id].update();
		}
	};	
})();