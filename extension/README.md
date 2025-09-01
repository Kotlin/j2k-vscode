# j2k-vscode

A VS Code extension which provides one-click, review-before-you-commit Java to Kotlin migration inside VS Code. The extension utilises LLMs to provide idiomatic conversion suggestions, helping Java developers migrate to Kotlin.

## Demo

https://github.com/user-attachments/assets/d9207f77-b4ca-4168-a418-92454a4d4a51

In the demo, a new project is opened, Kotlin is configured automatically, and converting a singular file/multiple files in succession is demonstrated. The accept/reject workflow is also demonstrated, with the ability to make desired changes before committing the changes. Additionally, integration with Git is demonstrated, so that version control history is preserved across the conversion.

## Installation

### Prerequisites

One of the following LM providers should be configured:

* GitHub Copilot Chat installed in VS Code and signed in.
* Ollama/LM Studio running locally and the chosen model pulled.
* A valid API key for OpenAI/OpenRouter.

### How to install

Download the latest `.vsix` from the releases section of this repository. Then, navigate to the Extensions tab in VS Code, click the three small dots on the top right corner of the tab, and choose `Install from VSIX...`. Then, select the newly downloaded J2K VSIX to finish the installation.

## Feedback

### Reporting an issue

To report a bug or an issue, please use GitHub issues and log an issue under this repository. 

### Contributing

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

* `j2k.provider`: The LLM backend to use for the Java to Kotlin conversion. Default: `GitHub Copilot`
* `j2k.model`: The model tag to use with the selected provider. Default: `codellama: instruct`.
* `j2k.ollama.baseUrl`: The base URL of the target instance, when the provider selected is Ollama.
* `j2k.openRouter.baseUrl`: The base URL of the target instance, when the provider selected is OpenRouter.
* `j2k.apiKey`: The API key to use with the selected provider (stored in VS Code Secrets).

# END OF UPDATED REGION

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

### 1.0.0

Upcoming!
