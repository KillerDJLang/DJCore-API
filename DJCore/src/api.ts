import { injectable }               from "tsyringe";
import { ConfigServer }             from "@spt-aki/servers/ConfigServer";
import { RagfairPriceService }      from "@spt-aki/services/RagfairPriceService";
import { CustomItemService }        from "@spt-aki/services/mod/CustomItemService";
import { JsonUtil }                 from "@spt-aki/utils/JsonUtil";
import { HashUtil }                 from "@spt-aki/utils/HashUtil";
import { IBarterScheme, ITrader }   from "@spt-aki/models/eft/common/tables/ITrader";
import { Item }                     from "@spt-aki/models/eft/common/tables/IItem";
import { NewItemFromCloneDetails }  from "@spt-aki/models/spt/mod/NewItemDetails";
import { IRagfairConfig }           from "@spt-aki/models/spt/config/IRagfairConfig";
import { ConfigTypes }              from "@spt-aki/models/enums/ConfigTypes";

@injectable()
export class API
{
    protected itemsToSell: Item[] = [];
    protected barterScheme: Record<string, IBarterScheme[][]> = {};
    protected loyaltyLevel: Record<string, number> = {};
    
//#region Item Gen
    public createItem(itemConfig: any, customItem: CustomItemService, tables: any, jsonUtil: JsonUtil, configServer: ConfigServer, hashUtil: HashUtil, ragfairPriceService: RagfairPriceService, baseParentBackup: string): void
    {
        const newItem: NewItemFromCloneDetails = {
            itemTplToClone: itemConfig.ItemToClone,
            overrideProperties: itemConfig.OverrideProperties,
            parentId: tables.templates.items[itemConfig.ItemToClone]._parent,
            newId: itemConfig.newID,
            handbookParentId: this.findHandbookParentFromClone(tables, itemConfig.ItemToClone),
            handbookPriceRoubles: this.findHandbookPriceFromClone(tables, itemConfig.ItemToClone),
            fleaPriceRoubles: this.findHandbookPriceFromClone(tables, itemConfig.ItemToClone),
            locales: {
                "en": {
                    name: itemConfig.LocalePush.en.name,
                    shortName: itemConfig.LocalePush.en.shortName,
                    description: itemConfig.LocalePush.en.description
                }
            }
        }
        customItem.createItemFromClone(newItem);

        if (itemConfig.CloneToFilters)
        {
            for (const item in tables.templates.items) 
            {
                const itemConflictId = tables.templates.items[item]._props.ConflictingItems;
                
                for (const itemInConflicts in itemConflictId) 
                {
                    const itemInConflictsFiltersId = itemConflictId[itemInConflicts];
                        
                    if (itemInConflictsFiltersId === itemConfig.ItemToClone) 
                    {
                        itemConflictId.push(itemConfig.newID);
                    }
                }
                
                for (const slots in tables.templates.items[item]._props.Slots) 
                {
                    const slotsId = tables.templates.items[item]._props.Slots[slots]._props.filters[0].Filter;
                    
                    for (const itemInFilters in slotsId) 
                    {
                        const itemInFiltersId = slotsId[itemInFilters]
                        
                        if (itemInFiltersId === itemConfig.ItemToClone) 
                        {
                            slotsId.push(itemConfig.newID);
                        }
                    }
                }

                for (const cartridge in tables.templates.items[item]._props.Cartridges) 
                {
                    const cartridgeId = tables.templates.items[item]._props.Cartridges[cartridge]._props.filters[0].Filter;
                    
                    for (const itemInFilters in cartridgeId) 
                    {
                        const itemInFiltersId = cartridgeId[itemInFilters]
                        
                        if (itemInFiltersId === itemConfig.ItemToClone) 
                        {
                            cartridgeId.push(itemConfig.newID);
                        }
                    }
                }

                for (const chamber in tables.templates.items[item]._props.Chambers) 
                {
                    const chamberId = tables.templates.items[item]._props.Chambers[chamber]._props.filters[0].Filter;
                    
                    for (const itemInFilters in chamberId) 
                    {
                        const itemInFiltersId = chamberId[itemInFilters]
                        
                        if (itemInFiltersId === itemConfig.ItemToClone) 
                        {
                            chamberId.push(itemConfig.newID);
                        }
                    }
                }
            }
        }

        if (itemConfig.PushMastery)
        {
            const new_mastery_DJCore = {
                "Name": itemConfig.LocalePush.en.name,
                "Templates": [
                    itemConfig.newID
                ],
                "Level2": 450,
                "Level3": 900
            }
            tables.globals.config.Mastering.push(new_mastery_DJCore)
        }

        if (itemConfig.BotPush?.AddToBots)
        {
            for (const botId in tables.bots.types) 
            {
                for (const lootSlot in tables.bots.types[botId].inventory.items) 
                {
                    const items = tables.bots.types[botId].inventory.items;
        
                    if (items[lootSlot][itemConfig.ItemToClone]) 
                    {
                        const weight = items[lootSlot][itemConfig.ItemToClone];
                        items[lootSlot][itemConfig.newID] = weight;
                    }
                }
        
                for (const equipSlot in tables.bots.types[botId].inventory.equipment) 
                {
                    const equip = tables.bots.types[botId].inventory.equipment
        
                    if (equip[equipSlot][itemConfig.ItemToClone]) 
                    {
                        const weight = equip[equipSlot][itemConfig.ItemToClone];
                        equip[equipSlot][itemConfig.newID] = weight;
                    }
                }
        
                for (const modItem in tables.bots.types[botId].inventory.mods) 
                {
                    for (const modSlot in tables.bots.types[botId].inventory.mods[modItem]) 
                    {
                        if (tables.bots.types[botId]?.inventory?.mods[modItem][modSlot][itemConfig.ItemToClone]) 
                        {
                            tables.bots.types[botId].inventory.mods[modItem][modSlot].push(itemConfig.newID);
                        }
                    }
        
                    if (tables.bots.types[botId]?.inventory?.mods[itemConfig.ItemToClone]) 
                    {
                        tables.bots.types[botId].inventory.mods[itemConfig.newID] = jsonUtil.clone(tables.bots.types[botId].inventory.mods[itemConfig.ItemToClone]);
                    }
                }
            }
        }

        if (itemConfig.LootPush?.AddToStaticLoot)
        {
            for (const lootContainer of itemConfig.LootPush?.LootContainersToAdd)
            {
                const lootToPush = 
                {
                    "tpl": itemConfig.newID,
                    "relativeProbability": itemConfig.LootPush?.StaticLootProbability
                }

                tables.loot.staticLoot[lootContainer].itemDistribution.push(lootToPush);
            }
        }

        if (itemConfig.CasesPush?.AddToCases)
        {
            const items = tables.templates.items

            for (const cases of itemConfig.CasesPush?.CaseFiltersToAdd)
            {
                for (const item in items) 
                {
                    if (items[item]._id === cases)
                    {
                        if (items[item]._props?.Grids[0]._props.filters[0].Filter === undefined)
                        {
                            const unbreakFilters = [
                                {
                                    "Filter": ["54009119af1c881c07000029"],
                                    "ExcludedFilter": [""]
                                }
                            ];
                            
                            tables.templates.items[cases]._props.Grids[0]._props.filters = unbreakFilters;
                        }
    
                        if (items[item]._props?.Grids[0]._props.filters[0].Filter !== undefined)
                        {
                            items[item]._props?.Grids[0]._props.filters[0].Filter.push(itemConfig.newID)
                        }
                    }
                }
            }
        }

        if (itemConfig.PushToFleaBlacklist)
        {
            const ragfair = configServer.getConfig<IRagfairConfig>(ConfigTypes.RAGFAIR);
            ragfair.dynamic.blacklist.custom.push(...[itemConfig.newID])
        }

        if (itemConfig.SlotInfo?.AddToSlot)
        {
            const DefaultInventory = tables.templates.items["55d7217a4bdc2d86028b456d"]._props.Slots;
            DefaultInventory[itemConfig.SlotInfo?.Slot]._props.filters[0].Filter.push(itemConfig.newID);
        }

        if (itemConfig.TraderScheme?.AddToTrader)
        {
            if (tables.templates.items[itemConfig.newID]._props.Slots != undefined)
            {
                const newOffer: Item[] = [];

                newOffer.push({
                    _id: `${itemConfig.newID}_${itemConfig.TraderScheme?.TraderToUse}_${hashUtil.generate()}}_DJApi`, 
                    _tpl: itemConfig.newID
                });

                tables.templates.items[itemConfig.newID]._props.Slots.forEach(slot => {
                if (slot._name != "mod_nvg")
                {
                    newOffer.push({
                        _id: hashUtil.generate(),
                        _tpl: slot._props.filters[0].Filter[0],
                        parentId: newOffer[0]._id,
                        slotId: slot._name
                    });  
                }})

                if (itemConfig.TraderScheme?.AddManualCost)
                {
                    this.createComplexAssortItem(newOffer)
                        .addUnlimitedStackCount()
                        .addLoyaltyLevel(itemConfig.TraderScheme?.LoyaltyLevel)
                        .addBarterCost(itemConfig.TraderScheme?.CurrencyToUse, itemConfig.TraderScheme?.Cost)
                        .export(tables.traders[itemConfig.TraderScheme?.TraderToUse]);
                }

                else
                {
                    this.createComplexAssortItem(newOffer)
                        .addUnlimitedStackCount()
                        .addLoyaltyLevel(itemConfig.TraderScheme?.LoyaltyLevel)
                        .addBarterCost(itemConfig.TraderScheme?.CurrencyToUse, ragfairPriceService.getFleaPriceForOfferItems(newOffer))
                        .export(tables.traders[itemConfig.TraderScheme?.TraderToUse]);
                }
            }
        
            else
            {                      
                tables.traders[itemConfig.TraderScheme?.TraderToUse].assort.items.push(
                {
                    "_id": `${itemConfig.newID}_${itemConfig.TraderScheme?.TraderToUse}}_${itemConfig.TraderScheme?.CurrencyToUse}_${itemConfig.TraderScheme?.Cost}_DJApi`,
                    "_tpl": itemConfig.newID,
                    "parentId": "hideout",
                    "slotId": "hideout",
                    "upd":
                    {
                        "UnlimitedCount": true,
                        "StackObjectsCount": 999999
                    }
                });
        
                tables.traders[itemConfig.TraderScheme?.TraderToUse].assort.barter_scheme[`${itemConfig.newID}_${itemConfig.TraderScheme?.TraderToUse}}_${itemConfig.TraderScheme?.CurrencyToUse}_${itemConfig.TraderScheme?.Cost}_DJApi`] = [
                    [
                        {
                            "count": itemConfig.TraderScheme?.Cost,
                            "_tpl": itemConfig.TraderScheme?.CurrencyToUse
                        }
                    ]
                ]; 
                tables.traders[itemConfig.TraderScheme?.TraderToUse].assort.loyal_level_items[`${itemConfig.newID}_${itemConfig.TraderScheme?.TraderToUse}}_${itemConfig.TraderScheme?.CurrencyToUse}_${itemConfig.TraderScheme?.Cost}_DJApi`] = itemConfig.TraderScheme?.LoyaltyLevel;
            }
        }
    }

    private findHandbookPriceFromClone(tables: any, cloneItem: string)
    {
        const hbItem = tables.templates.handbook.Items.find((item) => item.Id === cloneItem)
        return hbItem.Price;
    }

    private findHandbookParentFromClone(tables: any, cloneItem: string)
    {
        const hbItem = tables.templates.handbook.Items.find((item) => item.Id === cloneItem)
        return hbItem.ParentId;
    }
//#endregion
//
//
//
//#region Clothing Gen
    public createClothingTop(newTopConfig: any, tables: any, jsonUtil: JsonUtil): void
	{
		const newTop = jsonUtil.clone(tables.templates.customization["5d28adcb86f77429242fc893"]);
		const newHands = jsonUtil.clone(tables.templates.customization[newTopConfig.HandsToClone]);
		const newSet = jsonUtil.clone(tables.templates.customization["5d1f623e86f7744bce0ef705"]);

		newTop._id = newTopConfig.NewOutfitID;
		newTop._name = newTopConfig.LocaleName;
		newTop._props.Prefab.path = newTopConfig.BundlePath;
		tables.templates.customization[newTopConfig.NewOutfitID] = newTop;

		newHands._id = `${newTopConfig.NewOutfitID}Hands`;
		newHands._name = `${newTopConfig.LocaleName}Hands`;
		newHands._props.Prefab.path = newTopConfig.HandsBundlePath;
		tables.templates.customization[`${newTopConfig.NewOutfitID}Hands`] = newHands;

		newSet._id = `${newTopConfig.NewOutfitID}Set`;
		newSet._name = `${newTopConfig.LocaleName}Set`;
		newSet._props.Body = newTopConfig.NewOutfitID;
		newSet._props.Hands = `${newTopConfig.NewOutfitID}Hands`;
		newSet._props.Side = ["Usec", "Bear", "Savage"];
		tables.templates.customization[`${newTopConfig.NewOutfitID}Set`] = newSet;

        for (const locale in tables.locales.global) 
        {
			tables.locales.global[locale][`${newTopConfig.NewOutfitID}Set Name`] = newTopConfig.LocaleName;
		}

        if (newTopConfig.TraderScheme?.AddToTrader)
        {
            if (!tables.traders[newTopConfig.TraderScheme?.TraderToUse].base.customization_seller)
            {
                tables.traders[newTopConfig.TraderScheme?.TraderToUse].base.customization_seller = true;
            }
		
            if (!tables.traders[newTopConfig.TraderScheme?.TraderToUse].suits) 
            {
                tables.traders[newTopConfig.TraderScheme?.TraderToUse].suits = [];
            }
        
            tables.traders[newTopConfig.TraderScheme?.TraderToUse].suits.push({
                "_id": newTopConfig.NewOutfitID,
                "tid": newTopConfig.TraderScheme?.TraderToUse,
                "suiteId": `${newTopConfig.NewOutfitID}Set`,
                "isActive": true,
                "requirements": {
                    "loyaltyLevel": newTopConfig.TraderScheme?.LoyaltyLevel,
                    "profileLevel": newTopConfig.TraderScheme?.ProfileLevelRequirement,
                    "standing": newTopConfig.TraderScheme?.TraderStandingRequirement,
                    "skillRequirements": [],
                    "questRequirements": [],
                    "itemRequirements": [
                        {
                            "count": newTopConfig.TraderScheme?.Cost,
                            "_tpl": newTopConfig.TraderScheme?.CurrencyToUse
                        }
                    ]
                }
            });
        }
	}
	
	public createClothingBottom( newBottomConfig: any, tables: any, jsonUtil: JsonUtil): void
	{
		const newBottom = jsonUtil.clone(tables.templates.customization["5d5e7f4986f7746956659f8a"]);
		const newSet = jsonUtil.clone(tables.templates.customization["5cd946231388ce000d572fe3"]);

		newBottom._id = newBottomConfig.NewBottomsID;
		newBottom._name = newBottomConfig.LocaleName;
		newBottom._props.Prefab.path = newBottomConfig.BundlePath;
		tables.templates.customization[newBottomConfig.NewBottomsID] = newBottom;

		newSet._id = `${newBottomConfig.NewBottomsID}Set`;
		newSet._name = `${newBottomConfig.NewBottomsID}Set`;
		newSet._props.Feet = newBottomConfig.NewBottomsID;
		newSet._props.Side = ["Usec", "Bear", "Savage"];
		tables.templates.customization[`${newBottomConfig.NewBottomsID}Set`] = newSet;

        for (const locale in tables.locales.global) 
        {
			tables.locales.global[locale][`${newBottomConfig.NewBottomsID}Set Name`] = newBottomConfig.LocaleName;
		}

        if (newBottomConfig.TraderScheme?.AddToTrader)
        {
            if (!tables.traders[newBottomConfig.TraderScheme?.TraderToUse].base.customization_seller)
            {
                tables.traders[newBottomConfig.TraderScheme?.TraderToUse].base.customization_seller = true;
            }
            
            if (!tables.traders[newBottomConfig.TraderScheme?.TraderToUse].suits) 
            {
                tables.traders[newBottomConfig.TraderScheme?.TraderToUse].suits = [];
            }
            
            tables.traders[newBottomConfig.TraderScheme?.TraderToUse].suits.push({
                "_id": newBottomConfig.NewBottomsID,
                "tid": newBottomConfig.TraderScheme?.TraderToUse,
                "suiteId": `${newBottomConfig.NewBottomsID}Set`,
                "isActive": true,
                "requirements": {
                    "loyaltyLevel": newBottomConfig.TraderScheme?.LoyaltyLevel,
                    "profileLevel": newBottomConfig.TraderScheme?.ProfileLevelRequirement,
                    "standing": newBottomConfig.TraderScheme?.TraderStandingRequirement,
                    "skillRequirements": [],
                    "questRequirements": [],
                    "itemRequirements": [
                        {
                            "count": newBottomConfig.TraderScheme?.Cost,
                            "_tpl": newBottomConfig.TraderScheme?.CurrencyToUse
                        }
                    ]
                }
            });
        }
	}
//#endregion
//
//
//
//#region Assort Utils
    private createComplexAssortItem(items: Item[]): API
    {
        items[0].parentId = "hideout";
        items[0].slotId = "hideout";

        if (!items[0].upd)
        {
            items[0].upd = {}
        }

        items[0].upd.UnlimitedCount = false;
        items[0].upd.StackObjectsCount = 100;

        this.itemsToSell.push(...items);

        return this;
    }

    private addUnlimitedStackCount(): API
    {
        this.itemsToSell[0].upd.StackObjectsCount = 999999;
        this.itemsToSell[0].upd.UnlimitedCount = true;

        return this;
    }

    private addLoyaltyLevel(level: number)
    {
        this.loyaltyLevel[this.itemsToSell[0]._id] = level;

        return this;
    }

    private addBarterCost(itemTpl: string, count: number): API
    {
        const sellableItemId = this.itemsToSell[0]._id;

        // No data at all, create
        if (Object.keys(this.barterScheme).length === 0)
        {
            this.barterScheme[sellableItemId] = [[
                {
                    count: count,
                    _tpl: itemTpl
                }
            ]];
        }
        else
        {
            // Item already exists, add to
            const existingData = this.barterScheme[sellableItemId][0].find(x => x._tpl === itemTpl);
            if (existingData)
            {
                // itemtpl already a barter for item, add to count
                existingData.count+= count;
            }
            else
            {
                // No barter for item, add it fresh
                this.barterScheme[sellableItemId][0].push({
                    count: count,
                    _tpl: itemTpl
                })
            }
            
        }

        return this;
    }

    /**
     * Reset object ready for reuse
     * @returns 
     */
    private export(data: ITrader): API
    {
        const itemBeingSoldId = this.itemsToSell[0]._id;
        if (data.assort.items.find(x => x._id === itemBeingSoldId))
        {
            return;
        }

        data.assort.items.push(...this.itemsToSell);
        data.assort.barter_scheme[itemBeingSoldId] = this.barterScheme[itemBeingSoldId];
        data.assort.loyal_level_items[itemBeingSoldId] = this.loyaltyLevel[itemBeingSoldId];

        this.itemsToSell = [];
        this.barterScheme = {};
        this.loyaltyLevel = {};

        return this;
    }
//#endregion
//
//
//
//#region Presets
    public addPresets(PresetDirectory: any, tables: any): void
    {
        const presets = tables.globals;

        for (const itemPreset in PresetDirectory)
        {
            presets.ItemPresets[itemPreset] = PresetDirectory[itemPreset];
        }
    }
//#endregion
}

//#region Enums
export enum Traders
{
    Prapor = "54cb50c76803fa8b248b4571",
    Therapist = "54cb57776803fa99248b456e",
    Skier = "58330581ace78e27b8b10cee",
    Peacekeeper = "5935c25fb3acc3127c3d8cd9",
    Mechanic = "5a7c2eca46aef81a7ca2145d",
    Ragman = "5ac3b934156ae10c4430e83c",
    Jaeger = "5c0647fdd443bc2504c2d371"
}

export enum Currency
{
    Roubles = "5449016a4bdc2d6f028b456f",
    Dollars = "5696686a4bdc2da3298b456a",
    Euros = "569668774bdc2da2298b4568"
}

export enum Slots 
{
    PrimaryWeapon = 0,
    SecondaryWeapon = 1,
    Holster = 2,
    Scabbard = 3,
    Facecover = 4,
    Headwear = 5,
    TacticalVest = 6,
    SecuredContainer = 7,
    Backpack = 8,
    Armor = 9,
    Pockets = 10,
    Headphones = 11,
    Dogtag = 12,
    Eyewear = 13,
    Armband = 14
}
//#endregion