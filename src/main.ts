import Phaser from "phaser";
import { BootScene } from "./game/scenes/BootScene";
import { TitleScene } from "./game/scenes/TitleScene";
import { CharSelectScene } from "./game/scenes/CharSelectScene";
import { CutsceneScene } from "./game/scenes/CutsceneScene";
import { DialogueScene } from "./game/scenes/DialogueScene";
import { TownMeetingScene } from "./game/scenes/TownMeetingScene";
import { DebugScene } from "./game/scenes/DebugScene";
import { HubScene } from "./game/scenes/HubScene";
import { DungeonScene } from "./game/scenes/DungeonScene";
import { UIScene } from "./game/scenes/UIScene";
import { TVScene } from "./game/scenes/TVScene";
import { ArchiveScene } from "./game/scenes/ArchiveScene";
import { PubScene } from "./game/scenes/PubScene";
import { KrazyFactScene } from "./game/scenes/KrazyFactScene";
import { ExileScene } from "./game/scenes/ExileScene";
import { MenuScene } from "./game/scenes/MenuScene";
import { EndingScene } from "./game/scenes/EndingScene";
import { VignetteScene } from "./game/scenes/VignetteScene";
import { MinigameScene } from "./game/scenes/MinigameScene";
import { VenueScene } from "./game/scenes/VenueScene";
import { ClubScene } from "./game/scenes/ClubScene";
import { KreddleScene } from "./game/scenes/KreddleScene";
import { WeaponPickScene } from "./game/scenes/WeaponPickScene";
import { EnterScene } from "./game/scenes/EnterScene";
import { HomeScene } from "./game/scenes/HomeScene";
import { DriveScene } from "./game/scenes/DriveScene";
import { BeepBeepScene } from "./game/scenes/BeepBeepScene";
import { LairScene } from "./game/scenes/LairScene";
import { FinaleScene } from "./game/scenes/FinaleScene";
import { RoofCutscene } from "./game/scenes/citadel/RoofCutscene";
import { installDebug } from "./game/debug";
import { installCrashGuard } from "./game/crashGuard";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 960,
  height: 540,
  backgroundColor: "#0b0710",
  pixelArt: true,
  roundPixels: true,
  disableContextMenu: true,
  physics: { default: "arcade", arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { gamepad: true },
  scene: [
    BootScene,
    TitleScene,
    CharSelectScene,
    CutsceneScene,
    TownMeetingScene,
    DebugScene,
    HubScene,
    DungeonScene,
    UIScene,
    DialogueScene,
    TVScene,
    ArchiveScene,
    PubScene,
    KrazyFactScene,
    ExileScene,
    VignetteScene,
    MinigameScene,
    VenueScene,
    ClubScene,
    KreddleScene,
    WeaponPickScene,
    EnterScene,
    HomeScene,
    DriveScene,
    BeepBeepScene,
    LairScene,
    FinaleScene,
    RoofCutscene,
    MenuScene,
    EndingScene,
  ],
});

installDebug(game);
installCrashGuard(game);
