import { DependencyContainer, 
         Lifecycle }          from "tsyringe";
import { IPreAkiLoadMod }     from "@spt-aki/models/external/IPreAkiLoadMod";
import { LogTextColor }       from "@spt-aki/models/spt/logging/LogTextColor";
import { ILogger }            from "@spt-aki/models/spt/utils/ILogger";
import { API }                from "./api";

const modName = "DJCore API";

class DJCore implements IPreAkiLoadMod
{
    /**
    * @param container
    */
    public preAkiLoad(container: DependencyContainer): void 
    {
        const logger = container.resolve<ILogger>("WinstonLogger");
		container.register("API", API, {lifecycle: Lifecycle.Singleton});
        this.loadApiBanner(logger);
    }

    private loadApiBanner(logger: ILogger)
    {
        logger.log(
            `[DJCore] ----------------------------------------------------------------`,
            LogTextColor.MAGENTA
        );
        logger.log(
            `[DJCore]               ${modName} Loaded`,
            LogTextColor.MAGENTA
        );
        logger.log(
            `[DJCore] ----------------------------------------------------------------`,
            LogTextColor.MAGENTA
        );
    }
}

module.exports = { mod: new DJCore() };