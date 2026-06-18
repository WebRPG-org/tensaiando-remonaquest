/*:
 * @plugindesc MV用 選択肢横並び統合拡張（条件表示対応・完成版）
 * @author ChatGPT
 *
 * @param MergeWindowWidth
 * @type number
 * @default 600
 *
 * @param MergeWindowHeight
 * @type number
 * @default 180
 *
 * @param MergeWindowX
 * @type number
 * @default 0
 *
 * @param MergeWindowY
 * @type number
 * @default 360
 *
 * @param MergeColumns
 * @type number
 * @default 3
 */

(() => {
    const params = PluginManager.parameters(document.currentScript.src.match(/([^\/]+)\.js$/)[1]);
    const MW = Number(params.MergeWindowWidth);
    const MH = Number(params.MergeWindowHeight);
    const MX = Number(params.MergeWindowX);
    const MY = Number(params.MergeWindowY);
    const MC = Number(params.MergeColumns);

    // -----------------------------
    // 条件付き選択肢フィルタ
    // -----------------------------
    function checkChoiceCondition(text) {
        let t = text;

        // Switch
        t = t.replace(/\\SW\[(\d+)(,!)?\]/gi, (_, id, off) => {
            const ok = $gameSwitches.value(Number(id));
            return (off ? !ok : ok) ? "" : null;
        });
        if (t === null) return null;

        // Variable
        t = t.replace(/\\VAR\[(\d+)(==|!=|>=|<=|>|<)(-?\d+)\]/gi, (_, id, op, val) => {
            const v = $gameVariables.value(Number(id));
            const n = Number(val);
            let ok = false;
            switch (op) {
                case "==": ok = v == n; break;
                case "!=": ok = v != n; break;
                case ">=": ok = v >= n; break;
                case "<=": ok = v <= n; break;
                case ">": ok = v > n; break;
                case "<": ok = v < n; break;
            }
            return ok ? "" : null;
        });
        if (t === null) return null;

        return t;
    }

    // -----------------------------
    // Interpreter拡張
    // -----------------------------
    Game_Interpreter.prototype.findNextChoiceAtSameIndent = function(start) {
        const base = this._list[start].indent;
        for (let i = start + 1; i < this._list.length; i++) {
            const c = this._list[i];
            if (c.indent !== base) return null;
            if (c.code === 108 || c.code === 408) return null;
            if (c.code === 102) return i;
        }
        return null;
    };

    const _cmd102 = Game_Interpreter.prototype.command102;
    Game_Interpreter.prototype.command102 = function() {
        const i1 = this._index;
        const i2 = this.findNextChoiceAtSameIndent(i1);
        if (i2 === null) return _cmd102.call(this);

        const c1 = this._list[i1];
        const c2 = this._list[i2];

        const choices = [];
        const map = [];

        [c1, c2].forEach((cmd, ci) => {
            cmd.parameters[0].forEach((txt, ti) => {
                const t = checkChoiceCondition(txt);
                if (t !== null) {
                    map.push({ cmd: ci, index: ti });
                    choices.push(t);
                }
            });
        });

        if (!choices.length) {
            this._index = i2 + 1;
            return true;
        }

        this._branch[this._indent] = null;
        this._mergeChoiceMap = map;
        this._mergeChoiceBase = [i1, i2];
        this._index = i2 + 1;

        SceneManager._scene.startMergedChoice(choices);
        return true;
    };

    // -----------------------------
    // Scene_Map
    // -----------------------------
    Scene_Map.prototype.startMergedChoice = function(choices) {
        this._mergedChoiceWindow = new Window_MergedChoice(choices);
        this.addWindow(this._mergedChoiceWindow);
        this._mergedChoiceWindow.activate();
    };

    // -----------------------------
    // Window
    // -----------------------------
    function Window_MergedChoice() {
        this.initialize(...arguments);
    }

    Window_MergedChoice.prototype = Object.create(Window_Selectable.prototype);
    Window_MergedChoice.prototype.constructor = Window_MergedChoice;

    Window_MergedChoice.prototype.initialize = function(choices) {
        this._choices = choices;
        Window_Selectable.prototype.initialize.call(this, MX, MY, MW, MH);
        this.refresh();
        this.select(0);
    };

    Window_MergedChoice.prototype.maxItems = function() {
        return this._choices.length;
    };

    Window_MergedChoice.prototype.maxCols = function() {
        return MC;
    };

    Window_MergedChoice.prototype.drawItem = function(index) {
        const rect = this.itemRect(index);
        this.drawText(this._choices[index], rect.x, rect.y, rect.width, "center");
    };

    Window_MergedChoice.prototype.processOk = function() {
        SoundManager.playOk();
        const map = $gameMap._interpreter._mergeChoiceMap[this.index()];
        $gameMap._interpreter._branch[$gameMap._interpreter._indent] = map.index;
        this.close();
    };

    Window_MergedChoice.prototype.processCancel = function() {
        SoundManager.playCancel();
        const i2 = $gameMap._interpreter._mergeChoiceBase[1];
        const cmd = $gameMap._interpreter._list[i2];
        $gameMap._interpreter._branch[$gameMap._interpreter._indent] = cmd.parameters[1];
        this.close();
    };
})();
