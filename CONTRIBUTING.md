# Contributing to Branch Switch
Thank you for considering contributing to this project! Contributions, whether they're bug reports, feature suggestions, or code improvements, are greatly appreciated. This document outlines the guidelines for contributing.

## Getting Started
1. Reporting Issues

If you've encountered a bug or have an idea for a new feature, please:

- Search existing issues to avoid duplicates.
- Create a new issue if none exists, providing as much detail as possible:
  - Steps to reproduce the issue.
  - Expected and actual behavior.
  - Screenshots or logs, if applicable.
2. Development Setup

To contribute code, you’ll need to fork the repository and set up a local development environment.

### Prerequisites:
- Node.js installed.
- Visual Studio Code installed, with the VS Code Extension Development setup.

### Steps:
1. Fork the repository: Always fork from the development branch.
2. Clone your fork:

```
git clone https://github.com/Velocities/Branch-Switch.git
cd Branch-Switch
```
3. Set the upstream repository:

```
git remote add upstream https://github.com/Velocities/Branch-Switch.git
```

4. Install dependencies:

```
npm install
```

5. Start the development environment: Open the repository in Visual Studio Code and press F5 to launch a new instance for testing.

## Submitting Changes
**Important Note:** Any changes made to the codebase could require some corresponding updates
to the diagrams that model the code. Some of these diagrams may be incomplete or lacking in
particular detail due to the many layers to this project, but further refinement of those
diagrams is completely welcomed by all developers on the project.
Here are the links to all design diagrams we have thus far:
https://drive.google.com/file/d/1eLl9xmKG6E2N0VYsP-N_hpFWxrJzJ0Wz/view?usp=sharing
https://drive.google.com/file/d/1MDWtVwGP-VfffS_LxAQC0PaNh5RlglF6/view?usp=sharing

Any changes made to these diagrams should be completed as follows:
1. Make a copy of the diagram
  - You can do this by uploading the `.xml` file of the diagram you want to change
  into drawio for your own copy to modify
2. Make necessary changes to the diagram
3. Download diagram as xml
4. Copy and paste downloaded xml file into git-tracked file for this repo
5. Stage changes and commit (as per other changes to this repo)

Here is how you can make saves to the repo for your progress:
1. Branch Workflow
- Always create a feature branch off of development:

```
git checkout -b feature/my-awesome-feature
```

- Name branches descriptively, such as bugfix/fix-some-issue or feature/add-some-feature.

2. Commit Messages

Follow Conventional Commits for commit messages. For example:
- `feat: add tab restoration logic`
- `fix: handle edge case in branch switching`
- `docs: update README with usage details`

3. Handling Merge Conflicts

    Once your code has been tested and looks functional, make sure to perform a rebase if any changes have been made to the development branch since the time your branch was created or since the last time it was rebased:

  1. Fetch the latest changes from the main repository:

    ```
    git fetch upstream
    ```
  2. Rebase your branch on top of the updated development branch:

    ```
    git rebase upstream/development
    ```

  3. Resolve any merge conflicts:

    If conflicts arise during the rebase, Git will pause and mark the conflicting files.
    Open the files in your editor and resolve the conflicts manually.
    Once resolved, mark them as resolved:
    ```
    git add <file1> <file2>
    ``` 
  4. Continue the rebase process:

    ```
    git rebase --continue
    ```
    5. Verify your changes after the rebase:

    - Test your code again to ensure everything works as expected.

    6. Push your rebased branch:

    - Since rebasing rewrites commit history, you’ll need to force-push your branch:

    ```
    git push origin feature/my-awesome-feature --force  
    ```

4. Pull Requests

- Push your feature branch to your fork:
```
git push origin feature/my-awesome-feature
```
- Open a pull request (PR) against the development branch of the original repository.
- Provide a detailed description of your changes and link any related issues.
- Once your changes are reviewed by a repository maintainer, your PR will be squashed
and merged to ensure an atomic step in changes is made.

## Code Standards
### Formatting
Ensure your code adheres to the following:

- Use Prettier for code formatting.
- Follow the existing JavaScript style of reusable code in the project.
  - PR reviews will mention anything that's out of style before merging to ensure high code quality.

### Testing
- Write tests for any new functionality or significant changes.
- Run all tests to ensure nothing is broken:
```npm test```

## Development Notes
### For Repository Maintainers
If you're the primary developer, here's how to continue development while allowing contributions:

1. Create feature branches off of development as usual:

```
git checkout -b feature/some-change
```

2. If you're working on the repository directly (and not from a fork), simply push to your branches and merge into `development`.

3. If you want to try the forking workflow yourself:
- Fork the repository just like any other contributor.
- Clone your fork, and make changes there.
This dual workflow lets you handle project updates as a maintainer while keeping contributor workflows consistent.

This workflow for the repository is subject to feedback and change as overseen by repository maintainers.

### Questions?
If you have questions or need clarification about the contribution process, feel free to open an issue or reach out via a GitHub Issue. Issues will remain open until either being resolved or marked as stale for lack of responses or progress within a week's time.

We look forward to your contributions! 🎉