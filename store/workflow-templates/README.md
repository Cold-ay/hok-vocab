# Enable independent native build workflows

These are ready-to-install GitHub Actions templates. They are not active workflows in this repository yet. The Git credential available during preparation can push application code, but GitHub rejected workflow creation because that token lacks `workflow` scope.

To enable with authorized access, copy the files here into `.github/workflows/` using the GitHub web editor or a Git credential with workflow permission, commit, and push. Then use the Actions tab to run **Prepare App Store release** or **Prepare Play Store release**. The templates build unsigned verification artifacts without signing credentials and do not submit to either store. No native workflow result has been claimed or verified during preparation.

- app-store.yml: macOS 26, Xcode, CocoaPods → unsigned `.xcarchive` ZIP.
- play-store.yml: JDK 21, Android SDK 36 → unsigned `.aab`.

Application source kits remain usable without GitHub Actions: use their local release commands after installing the respective toolchains. Both templates use read-only repository permissions and store artifacts for 14 days. Review any GitHub Actions billing applicable to your repository before running them.
