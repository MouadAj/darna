import {Module} from '@nestjs/common';
import {HomeIssuesController} from './home-issues.controller';
import {HomeIssuesService} from './home-issues.service';
@Module({controllers: [HomeIssuesController], providers: [HomeIssuesService]})
export class HomeIssuesModule {}
