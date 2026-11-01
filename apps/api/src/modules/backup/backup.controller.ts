import { Body, Controller, Get, Post } from "@nestjs/common";
import { BackupImportSchema } from "@roleradar/contracts";
import { BackupService } from "./backup.service";

@Controller("backup")
export class BackupController {
  constructor(private readonly service: BackupService) {}
  @Get("export") exportData() { return this.service.exportData(); }
  @Get("status") status() { return this.service.getBackupStatus(); }
  @Post("run") runBackup() { return this.service.createAutomaticBackup(); }
  @Post("import") importData(@Body() body: unknown) {
    return this.service.importData(BackupImportSchema.parse(body));
  }
}
