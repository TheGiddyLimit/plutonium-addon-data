import {SharedConsts} from "../shared/SharedConsts.js";
import {OptionalDependenciesManager} from "./OptionalDependenciesManager.js";

export class DataManager {
	static #P_INDEX = null;

	static async api_pGetExpandedAddonData (
		{
			propJson,
			path,
			fnMatch,
		},
	) {
		const index = await (this.#P_INDEX = this.#P_INDEX || DataUtil.loadJSON(`${SharedConsts.MODULE_PATH}/data/_generated/index.json`));

		const ixFile = MiscUtil.get(index, propJson, ...path);
		if (ixFile == null) return null;

		const json = await DataUtil.loadJSON(`${SharedConsts.MODULE_PATH}/data/${index._file[ixFile]}`);

		const out = (json?.[propJson] || [])
			.find(it => fnMatch(it));
		if (!out) return null;

		return this._getFiltered(this._getPostProcessed(out));
	}

	static _getPostProcessed (out) {
		out = this._getPostProcessed_effects({out});
		out = this._getPostProcessed_itemMacro({out});
		return out;
	}

	static _getPostProcessed_effects ({out}) {
		if (!out.effects?.some(({convenientEffect}) => !!convenientEffect)) return out;

		out = foundry.utils.deepClone(out);

		out.effects = out.effects.map(eff => {
			if (!eff.convenientEffect) return eff;

			const convEffect = game.dfreds.effectInterface.findEffectByName(eff.convenientEffect);
			if (!convEffect) return eff;

			const convEffectData = convEffect.convertToActiveEffectData({
				includeAte: game.modules.get("ATL")?.active,
				includeTokenMagic: game.modules.get("tokenmagic")?.active,
			});

			delete eff.convenientEffect;

			return foundry.utils.mergeObject(
				convEffectData,
				{
					// region Convert to our alternate field names, which are prioritized. This ensures the CE name/image
					//   will be used over a name/image generated from the parent document.
					name: convEffectData.label,
					img: convEffectData.icon,
					// endregion
					...eff,
					// Override CE's built-in IDs, as they are not valid (e.g. `"id": "Convenient Effect: Invisible"`),
					//   which causes issues when creating temporary actors (e.g. when using Quick Insert to view a
					//   creature).
					id: foundry.utils.randomID(),
				},
			);
		});

		return out;
	}

	static _getPostProcessed_itemMacro ({out}) {
		if (!out.itemMacro) return out;

		out = foundry.utils.deepClone(out);

		out.flags = out.flags || {};
		out.flags.itemacro = {
			"macro": {
				"_id": null,
				"name": "-",
				"type": "script",
				"author": game.userId,
				"img": "icons/svg/dice-target.svg",
				"scope": "global",
				"command": out.itemMacro,
				"folder": null,
				"sort": 0,
				"ownership": {"default": 0},
				"flags": {},
			},
		};

		delete out.itemMacro;

		return out;
	}

	static _getFiltered (out) {
		out = this._getFiltered_effects({out});
		return out;
	}

	static _getFiltered_effects ({out}) {
		if (!out.effects?.some(({requires}) => !!requires)) return out;

		out = foundry.utils.deepClone(out);

		out.effects = out.effects
			.filter(eff => {
				if (!eff.requires) return true;

				return Object.keys(eff.requires)
					.map(moduleId => {
						if (game.modules.get(moduleId)?.active) return true;
						OptionalDependenciesManager.doNotifyMissing(moduleId);
						return false;
					})
					// Avoid using `.every` directly, above, so that we run through all possible requirements for each effect
					.every(Boolean);
			});

		return out;
	}
}
