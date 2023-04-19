import {DataSourceSelf} from "./data-source/DataSourceSelf.js";
import {DataSourceIntegrations} from "./data-source/DataSourceIntegrations.js";
import {SharedConsts} from "../shared/SharedConsts.js";
import {ModuleSettingConsts} from "./ModuleSettingConsts.js";
import {StartupHookMixin} from "./mixins/MixinStartupHooks.js";
import {Util} from "./Util.js";

export class DataManager extends StartupHookMixin(class {}) {
	static _onHookInitDev () {
		game.settings.register(
			SharedConsts.MODULE_ID,
			ModuleSettingConsts.DEV_IS_WARN_WHEN_NOT_AUTOMATED,
			{
				name: "PLUTAA.Developer: Warn when Not Automated",
				hint: "Log a message when a non-automated document is imported.",
				default: false,
				type: Boolean,
				scope: "client",
				config: true,
				restricted: true,
			},
		);
	}

	/* -------------------------------------------- */

	static _LOGGED_IDENTIFIERS = new Set();

	static _doDevWarn ({ent, out}) {
		if (out) return;
		if (!game.settings.get(SharedConsts.MODULE_ID, ModuleSettingConsts.DEV_IS_WARN_WHEN_NOT_AUTOMATED)) return;

		const ident = `${ent.name} (${ent.source})`;

		if (this._LOGGED_IDENTIFIERS.has(ident)) return;
		this._LOGGED_IDENTIFIERS.add(ident);

		console.warn(...Util.LGT, `No automation found for: ${ident}`);
	}

	/* -------------------------------------------- */

	static async api_pGetExpandedAddonData (
		{
			propJson,
			path,
			fnMatch,
			ent,
			isSilent = false,
		},
	) {
		const dataSources = [
			DataSourceSelf,
			DataSourceIntegrations,
		];

		const out = await dataSources.pSerialAwaitFirst(dataSource => dataSource.pGetExpandedAddonData({
			propJson,
			path,
			fnMatch,
			ent,
			isSilent,
		}));

		this._doDevWarn({ent, out});

		return out;
	}
}
