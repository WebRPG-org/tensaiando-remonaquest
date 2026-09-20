/*:
 * @plugindesc 選択肢に応じてランダムメッセージを左下に表示（部分一致対応）@MV専用
 * @author You
 *
 * @help
 * マップ画面で選択肢を選んだ際に、対応する配列からランダムに1つ
 * 左下にメッセージを浮かび上がらせます。
 *
 * 部分一致対応：
 *  選択肢のテキストに「攻撃する」が含まれていれば発火。
 *
 * 特定の配列はコード内の ChoiceMessageMap に定義してください。
 */

(function() {
    // 選択肢ごとの対応データ（部分一致判定用のキー）
    const ChoiceMessageMap = {
        "たたく": ["力強い一撃！", "敵を切り裂いた！", "鋭い攻撃だ！"],
        "逃げる": ["逃げ出した！", "一目散に退散！", "後ろを振り返らない！"],
        "守る": ["しっかり防御！", "盾を構えた！", "防御態勢に入った！"]
    };

    // --- 表示用コンテナ ---
    function FloatingMessage(text) {
        this.initialize(text);
    }

    FloatingMessage.prototype.initialize = function(text) {
        this._sprite = new Sprite(new Bitmap(Graphics.width, Graphics.height));
        this._sprite.bitmap.fontSize = 18;
        this._sprite.bitmap.textColor = "#ffffff";
        this._sprite._life = 120; // フレーム数（約2秒）
        this._sprite._text = text;

        const padding = 6;
        const w = this._sprite.bitmap.measureTextWidth(text) + padding * 2;
        const h = 24;

        this._sprite.bitmap.fillRect(0, 0, w, h, "rgba(0,0,0,0.7)");
        this._sprite.bitmap.drawText(text, padding, 0, w - padding*2, h, "left");

        this._sprite.x = 10;
        this._sprite.y = Graphics.height - 60; // 左下基準位置
    };

    FloatingMessage.prototype.update = function(index) {
        this._sprite._life--;
        this._sprite.y -= 0.5; // 上昇
        this._sprite.opacity = Math.max(0, this._sprite._life * 255 / 120);
        this._sprite.y -= index * 26; // 重ね順
    };

    // --- Scene_Map の更新 ---
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        if (!this._floatingMessages) this._floatingMessages = [];
        this.updateFloatingMessages();
    };

    Scene_Map.prototype.updateFloatingMessages = function() {
        if (!this._floatingMessages) return;
        this._floatingMessages.forEach((msg, i) => msg.update(i));
        this._floatingMessages = this._floatingMessages.filter(msg => msg._sprite._life > 0);
        this._floatingMessages.forEach(msg => {
            if (!msg._sprite.parent) this.addChild(msg._sprite);
        });
        // 最大5つ制限
        while (this._floatingMessages.length > 5) {
            const removed = this._floatingMessages.shift();
            this.removeChild(removed._sprite);
        }
    };

    Scene_Map.prototype.addFloatingMessage = function(text) {
        if (!this._floatingMessages) this._floatingMessages = [];
        const msg = new FloatingMessage(text);
        this._floatingMessages.push(msg);
        this.addChild(msg._sprite);
    };

    // --- 選択肢決定フック ---
    const _Window_Command_callOkHandler = Window_Command.prototype.callOkHandler;
    Window_Command.prototype.callOkHandler = function() {
        const choice = this.currentData() ? this.currentData().name : null;
        if (choice) {
            // 部分一致チェック
            for (const key in ChoiceMessageMap) {
                if (choice.includes(key)) {
                    const arr = ChoiceMessageMap[key];
                    const text = arr[Math.floor(Math.random() * arr.length)];
                    if (SceneManager._scene.addFloatingMessage) {
                        SceneManager._scene.addFloatingMessage(text);
                    }
                    break; // 最初に一致したものだけ
                }
            }
        }
        _Window_Command_callOkHandler.call(this);
    };

})();
