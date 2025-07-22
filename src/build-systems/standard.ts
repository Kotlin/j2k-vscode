import * as vscode from "vscode";
import { JVMBuildSystem } from ".";

export class NoBuildSystem implements JVMBuildSystem {
  name: string = "none";

  async needsKotlin() {
    return false;
  }

  async enableKotlin() {
    /* no op */
  }
}