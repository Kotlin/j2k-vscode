# j2k-vscode

An extension which provides one-click, review-before-you-commit Java to Kotlin migration inside VS Code.

## Features

### Convert to Kotlin

Right click a `.java` file, a selection of files or a folder to convert all selected `.java` files.

### Instant diff preview

A side-by-side diff opens so you can review and edit the generated Kotlin before saving changes.

### Accept and Cancel

Accept the changes to replace the Java file with its Kotlin replacement, or cancel to close the preview with no changes.

### Version-control integration

Commit the conversion as a rename and modification which keeps commit history intact. Currently supported version control software: Git

### Build System integration

Automatically configure Kotlin for your project. Currently supported build systems: Gradle

### Integration with many major model providers

Use popular models seamlessly to power Kotlin conversion. Currently supported: OpenAI, OpenAI-like (OpenRouter, LM Studio), Ollama, VSCode-integrated Github Copilot

## Extension Settings

This extension contributes the following settings:

* `j2k.provider`: The LLM backend to use for the Java to Kotlin conversion.
* `j2k.model`: The model tag to use with the selected provider.
* `j2k.ollama.baseUrl`: The base URL of the target instance, when the provider selected is Ollama.
* `j2k.openRouter.baseUrl`: The base URL of the target instance, when the provider selected is OpenRouter.
* `j2k.apiKey`: The API key to use with the selected provider (stored in VS Code Secrets).

# END OF UPDATED REGION

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
