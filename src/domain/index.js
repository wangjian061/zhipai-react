import * as app from "./app.js";
import * as liquid_tabs from "./liquid-tabs.js";
import * as support from "./support.js";
import * as album from "./album.js";
import * as photo_making from "./photo-making.js";
import * as camera from "./camera.js";
import "./specifications.js";
import * as scan from "./scan.js";
import * as photo_choice from "./photo-choice.js";
import * as my from "./my.js";
import * as print from "./print.js";
import * as tools from "./tools.js";
import * as account from "./account.js";
import * as collection from "./collection.js";
import * as orders from "./orders.js";
import { setDomainGlobals } from "../runtime/state.js";
setDomainGlobals(
  Object.assign(
    {},
    app,
    liquid_tabs,
    support,
    album,
    photo_making,
    camera,
    scan,
    photo_choice,
    my,
    print,
    tools,
    account,
    collection,
    orders,
  ),
);
