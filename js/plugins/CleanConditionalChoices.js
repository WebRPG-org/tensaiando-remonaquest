/*:
 * @target MV
 * @plugindesc 条件を満たさない選択肢を完全に非表示にする
 * @author ChatGPT
 *
 * @help
 * 【使い方】
 * 選択肢テキストの末尾に条件タグを記述します。
 *
 * ■ スイッチ条件
 * 例: 攻撃する \SW[5]
 * → スイッチ5がONの時のみ表示
 *
 * ■ 変数条件
 * 例: 逃げる \VAR[3>=10]
 * 例: 話す \VAR[2==1]
 *
 * 条件を満たさない選択肢は、見た目上完全に消えます。
 *
 * 【利用規約】
 * ・商用利用可
 * ・アダルト利用可
 * ・改変、再配布可
 * ・クレジット表記不要
 */

(function () {

    // 元処理保存
    const _command102 = Game_Interpreter.prototype.command102;

    Game_Interpreter.prototype.command102 = function (params) {
        let choices = params[0];
        let newChoices = [];
        let indexMap = [];

        for (let i = 0; i < choices.length; i++) {
            const text = choices[i];
            if (this.isChoiceVisible(text)) {
                newChoices.push(this.cleanChoiceText(text));
                indexMap.push(i);
            }
        }

        // 全部消えた場合はキャンセル扱い
        if (newChoices.length === 0) {
            this._branch[this._indent] = params[1];
            return true;
        }

        // 選択肢置き換え
        params[0] = newChoices;

        // 分岐補正
        this._choiceMap = indexMap;

        return _command102.call(this, params);
    };

    // 分岐番号補正
    const _setupChoices = Game_Message.prototype.setupChoices;
    Game_Message.prototype.setupChoices = function (params) {
        _setupChoices.call(this, params);

        const interpreter = $gameMap._interpreter;
        if (interpreter && interpreter._choiceMap) {
            const map = interpreter._choiceMap;
            const lastCallback = this._choiceCallback;

            this._choiceCallback = function (n) {
                lastCallback(map[n]);
            };

            interpreter._choiceMap = null;
        }
    };

    // 表示判定
    Game_Interpreter.prototype.isChoiceVisible = function (text) {
        const sw = text.match(/\\SW\[(\d+)\]/i);
        if (sw) {
            return $gameSwitches.value(Number(sw[1]));
        }

        const vr = text.match(/\\VAR\[(\d+)([=!<>]=?)(\d+)\]/i);
        if (vr) {
            const value = $gameVariables.value(Number(vr[1]));
            const cond = vr[2];
            const target = Number(vr[3]);

            switch (cond) {
                case '==': return value === target;
                case '!=': return value !== target;
                case '>':  return value > target;
                case '>=': return value >= target;
                case '<':  return value < target;
                case '<=': return value <= target;
            }
        }

        return true;
    };

    // タグ削除
    Game_Interpreter.prototype.cleanChoiceText = function (text) {
        return text
            .replace(/\\SW\[\d+\]/gi, '')
            .replace(/\\VAR\[\d+[=!<>]=?\d+\]/gi, '')
            .trim();
    };

})();
