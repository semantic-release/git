# @semantic-release/git

Set of [semantic-release](https://github.com/semantic-release/semantic-release) plugins for publishing to a [git](https://git-scm.com/) repository.

[![Travis](https://img.shields.io/travis/semantic-release/git.svg)](https://travis-ci.org/semantic-release/git)
[![Codecov](https://img.shields.io/codecov/c/github/semantic-release/git.svg)](https://codecov.io/gh/semantic-release/git)
[![Greenkeeper badge](https://badges.greenkeeper.io/semantic-release/git.svg)](https://greenkeeper.io/)

## verifyConditions

Verify the access to the remote Git repository, the commit `message` format and the `assets` option configuration.

## getLastRelease

Determine the Git tag and version of the last tagged release.

## publish

Update the `CHANGELOG.md` file and publish a release commit, optionnaly including addtional files.

## Configuration

### Git Repository authentication

The `Git` authentication configuration is **required** and can be set either:
- with the [`GIT_CREDENTIALS` environment variable](#environment-variables) for accessing the repository via [https](https://git-scm.com/book/en/v2/Git-on-the-Server-The-Protocols#_the_http_protocols)
- or with [ssh keys](#set-up-the-ssh-keys) to access via [ssh](https://git-scm.com/book/en/v2/Git-on-the-Server-The-Protocols#_the_ssh_protocol)

If the `GIT_CREDENTIALS` environment variable is set the remote Git repository will automatically be accessed via `https`, independently of the `repositoryUrl` format configured in `semantic-release` (the format will be automatically converted as needed).

Using the `GIT_CREDENTIALS` environment variable is the recommended configuration.

`GIT_CREDENTIALS` can be your Git username and passort in the format `<username>:<password>` or a token for certain Git providers like [Github](https://help.github.com/articles/creating-a-personal-access-token-for-the-command-line/), [Bitbucket](https://confluence.atlassian.com/bitbucketserver/personal-access-tokens-939515499.html) or [Gitlab](https://docs.gitlab.com/ce/user/profile/personal_access_tokens.html).

If the `GH_TOKEN` or `GITHUB_TOKEN` environment variables are defined their value will be used as a replacement for `GIT_CREDENTIALS`. 

### Environment variables

| Variable          | Description                                                                                                                                 | Default                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `GIT_CREDENTIALS` | [URL encoded basic HTTP Authentication](https://en.wikipedia.org/wiki/Basic_access_authentication#URL_encoding) credentials).               | `GH_TOKEN` or `GITHUB_TOKEN` environment variables. |
| `GIT_USERNAME`    | [Git username](https://git-scm.com/book/en/v2/Getting-Started-First-Time-Git-Setup#_your_identity) associated with the release commit.      | @semantic-release-bot.                              |
| `GIT_EMAIL`       | [Git email address](https://git-scm.com/book/en/v2/Getting-Started-First-Time-Git-Setup#_your_identity) associated with the release commit. | @semantic-release-bot email address.                |

### Options

| Options        | Description                                                    | Default                                                                     |
| -------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `changelog`    | Whether to create/update the `CHANGELOG.md` file.              | `true`                                                                      |
| `message`      | The message for the release commit. See [message](#message).   | `chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}`  |
| `assets`       | Files to include in the release commit. See [assets](#assets). | `["package.json", "npm-shrinkwrap.json"]`                                   |

#### `message`

The message for the release commit is generated with [Lodash template](https://lodash.com/docs#template). The following variables are available:

| Parameter     | Desciption                                                                          |
| ------------- | ----------------------------------------------------------------------------------- |
| `branch`      | The branch from which the release is done.                                          |
| `lastRelease` | `Object` with `version`, `gitTag` and `gitHead` of the last release.                |
| `nextRelease` | `Object` with `version`, `gitTag`, `gitHead` and `notes` of the release being done. |

It is recommended to include `[skip ci]` in the commit message to not trigger a new build.
**Note**: Some CI service support the `[skip ci]` keyword only in the subject of the message.

##### `message` examples

The `message` `Release ${nextRelease.version} - ${new Date().toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })} [skip ci]\n\n${nextRelease.notes}` will generate the commit message:

> Release v1.0.0 - Oct. 21, 2015 1:24 AM \[skip ci\]<br><br>## 1.0.0<br><br>### Features<br>* Generate 1.21 gigawatts of electricity<br>...

#### `assets`

Can be an `Array` or a single entry. Each entry can be either:
- a [glob](https://github.com/micromatch/micromatch#matching-features)
- or an `Object` with a `path` property containing a [glob](https://github.com/micromatch/micromatch#matching-features).

Each entry in the `assets` `Array` is globbed individually. A [glob](https://github.com/micromatch/micromatch#matching-features) can be a `String` (`"dist/**/*.js"` or `"dist/mylib.js"`) or an `Array` of `String`s that will be globbed together (`["dist/**", "!**/*.css"]`).

If a directory is configured, all the files under this directory and its children will be included.

If a file has a match in `.gitignore` it will always be excluded.

##### `assets` examples

`'dist/*.js'`: include all `js` files in the `dist` directory, but not in its sub-directories.

`'dist/**/*.js'`: include all `js` files in the `dist` directory and its sub-directories.

`[['dist', '!**/*.css']]`: include all files in the `dist` directory and its sub-directories excluding the `css` files.

`[['dist', '!**/*.css'], 'package.json']`: include `package.json` and all files in the `dist` directory and its sub-directories excluding the `css` files.

`[['dist/**/*.{js,css}', '!**/*.min.*']]`: include all `js` and `css` files in the `dist` directory and its sub-directories excluding the minified version.

### Usage

Options can be set within the plugin definition in the `semantic-release` configuration file:

```json
{
  "release": {
    "publish": [
      "@semantic-release/npm",
      {
        "path": "@semantic-release/git",
        "assets": ["package.json", "dist/**/*.{js|css}", "docs"],
        "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
      },
      "@semantic-release/github"
    ]
  }
}
```

When using with the [npm](https://github.com/semantic-release/npm) plugin or the [github](https://github.com/semantic-release/github) plugin:
- The [npm](https://github.com/semantic-release/npm) plugin must be called first in order to update the `package.json` file so the [git](https://github.com/semantic-release/git) plugin can include it in the release commit.
- The [github](https://github.com/semantic-release/github) plugin must be called last to create a [Github Release](https://help.github.com/articles/about-releases/) that reference the tag created by the [git](https://github.com/semantic-release/git) plugin.

To use with [github](https://github.com/semantic-release/github), [npm](https://github.com/semantic-release/npm) and [condition-travis](https://github.com/semantic-release/condition-travis):

```json
{
  "release": {
    "verifyConditions": ["@semantic-release/condition-travis", "@semantic-release/npm", "@semantic-release/git", "@semantic-release/github"],
    "getLastRelease": "@semantic-release/npm",
    "publish": ["@semantic-release/npm", "@semantic-release/git", "@semantic-release/github"]
  }
}
```

To use with [github](https://github.com/semantic-release/github), and [condition-travis](https://github.com/semantic-release/condition-travis):

```json
{
  "release": {
    "verifyConditions": ["@semantic-release/condition-travis", "@semantic-release/git", "@semantic-release/github"],
    "getLastRelease": "@semantic-release/git",
    "publish": ["@semantic-release/git", "@semantic-release/github"]
  }
}
```

### GPG signature

Using GPG, you can [sign and verify tags and commits](https://git-scm.com/book/id/v2/Git-Tools-Signing-Your-Work). With GPG keys, the release tags and commits made by `semantic-release` are verified and other people can trust that they were really were made by your account.

#### Generate the GPG keys

If you already have a GPG public and private key you can skip this step and go to the [Get the GPG keys ID and the public key content](#get-the-gpg-keys-id-and-the-public-key-content) step.

[Download and install the GPG command line tools](https://www.gnupg.org/download/#binary) for your operating system.

Create a GPG key

```bash
$ gpg --full-generate-key
```

At the prompt select the `RSA and RSA` king of key, enter `4096` for the keysize, specify how long the key should be valid, enter yout name, the email associated with your Git hosted account and finally set a long and hard to guess passphrase.

#### Get the GPG keys ID and the public key content

Use `Use the gpg --list-secret-keys --keyid-format LONG command to list GPG keys` to list your GPG keys and from the list, copy the GPG key ID you just created.

```bash
$ gpg --list-secret-keys --keyid-format LONG
/Users/<user_home>/.gnupg/pubring.gpg
---------------------------------------
sec   rsa4096/XXXXXXXXXXXXXXXX 2017-12-01 [SC]
uid                 <your_name> <your_email>
ssb   rsa4096/YYYYYYYYYYYYYYYY 2017-12-01 [E]
```
the GPG key ID if 16 character string, on the on the `sec` line, after `rsa4096`. In this example, the GPG key ID is `XXXXXXXXXXXXXXXX`.

Export the public key (replace XXXXXXXXXXXXXXXX with your key ID):

```bash
$ gpg --armor --export XXXXXXXXXXXXXXXX
```

Copy your GPG key, beginning with -----BEGIN PGP PUBLIC KEY BLOCK----- and ending with -----END PGP PUBLIC KEY BLOCK-----

#### Add the GPG key to your Git hosted account

##### Add the GPG key to Github

In Github **Settings**, click on **SSH and GPG keys** in the sidebar, then on the **New GPG Key** button.

Paste the entire GPG key export previously and click the **Add GPG Key** button.

See [Adding a new GPG key to your GitHub account](https://help.github.com/articles/adding-a-new-gpg-key-to-your-github-account/) for more details.

### Use the GPG key to sign commit and tags locally

If you want to use this GPG to also sign the commits and tags you create on your local machine you can follow the instruction at [Git Tools - Signing Your Work](https://git-scm.com/book/id/v2/Git-Tools-Signing-Your-Work)
This step is optionnal and unrelated to `semantic-release`.

#### Add the GPG keys to your CI environment

Make the public and private GPG key available on the CI environment. Encrypt the keys, commit it to your repository and configure the CI environment to decrypt it.

##### Add the GPG keys to Travis CI

Install the [Travis CLI](https://github.com/travis-ci/travis.rb#installation):

```bash
$ gem install travis
```

[Login](https://github.com/travis-ci/travis.rb#login) to Travis with the CLI:

```bash
$ travis login
```

Add the following [environment](https://github.com/travis-ci/travis.rb#env) variables to Travis:
- `GPG_PASSPHRASE` to Travis with the value set during the [GPG keys generation](#generate-the-gpg-keys) step
- `GPG_KEY_ID` to Travis with the value of your GPG key ID retrieved during the [GPG keys generation](#generate-the-gpg-keys) (replace XXXXXXXXXXXXXXXX with your key ID)
- `GIT_EMAIL` with the email adress you set during the [GPG keys generation](#generate-the-gpg-keys) step
- `GIT_USERNAME` with the name you set during the [GPG keys generation](#generate-the-gpg-keys) step

```bash
$ travis env set GPG_PASSPHRASE <gpg_passphrase>
$ travis env set GPG_KEY_ID XXXXXXXXXXXXXXXX
$ travis env set GIT_EMAIL <your_email>
$ travis env set GIT_USERNAME <your_name>
```

From your repository root export your public and private GPG keys in the `git_gpg_keys.asc` (replace XXXXXXXXXXXXXXXX with your key ID):

```bash
$ gpg --export -a XXXXXXXXXXXXXXXX > git_gpg_keys.asc
$ gpg --export-secret-key -a XXXXXXXXXXXXXXXX >> git_gpg_keys.asc
```

[Encrypt](https://github.com/travis-ci/travis.rb#encrypt) the `git_gpg_keys.asc` (public and private key) using a symmetric encryption (AES-256), and store the secret in a secure environment variable in the Travis environment:

```bash
$ travis encrypt-file git_gpg_keys.asc
```
The `travis encrypt-file` will encrypt the keys into the `git_gpg_keys.asc.enc` file and output in the console the command to add to your `.travis.yml` file. It should look like `openssl aes-256-cbc -K $encrypted_AAAAAAAAAAAA_key -iv $encrypted_BBBBBBBBBBBB_iv -in git_gpg_keys.asc.enc -out git_gpg_keys.asc -d`.

Copy this command to your `.travis.yml` file in the `before_install` step. Change the output path to write the unencrypted key in `/tmp`: `-out git_gpg_keys.asc` => `/tmp/git_gpg_keys.asc`. This will avoid to commit / modify / delete the unencrypted keys by mistake on the CI. Then add the commands to decrypt the GPG keys and make it available to `git`:

```yaml
before_install:
  # Decrypt the git_gpg_keys.asc.enc key into /tmp/git_gpg_keys.asc
  - openssl aes-256-cbc -K $encrypted_AAAAAAAAAAAA_key -iv $encrypted_BBBBBBBBBBBB_iv -in git_gpg_keys.asc.enc -out /tmp/git_gpg_keys.asc -d
  # Make sure only the current user can read the keys
  - chmod 600 /tmp/git_gpg_keys.asc
  # Create a script that pass the passphrase to the gpg CLI called by git
  - echo '/usr/bin/gpg2 --passphrase ${GPG_PASSPHRASE} --batch --no-tty "$@"' > /tmp/gpg-with-passphrase && chmod +x /tmp/gpg-with-passphrase
  # Configure git to use the script that passes the passphrase
  - git config gpg.program "/tmp/gpg-with-passphrase"
  # Configure git to sign the commits and tags
  - git config commit.gpgsign true
  # Configure git to use your GPG key
  - git config --global user.signingkey ${GPG_KEY_ID}
```

See [Encrypting Files](https://docs.travis-ci.com/user/encrypting-files/) for more details.

Delete the local keys as it won't be used anymore:

```bash
$ rm git_gpg_keys.asc
```

Commit the encrypted keys and the `.travis.yml` file to your repository:

```bash
$ git add git_gpg_keys.asc.enc .travis.yml
$ git commit -m "ci(travis): Add the encrypted GPG keys"
$ git push
```

### Set up the SSH keys

In order to allows `semantic-release` to push commits to your repository from the CI, you need to geneate a SSH key, add it to your Git hosted account, make it available on the CI environment.

#### Generate the SSH keys

In your local repository root:

```bash
$ ssh-keygen -t rsa -b 4096 -C "<your_email>" -f git_deploy_key -N "<ssh_passphrase>"
```

`your_email` must be the email associated with your Git hosted account. `ssh_passphrase` must be a long and hard to guess string. It will be used later.

This will generate a public key in `git_deploy_key.pub` and a private key in `git_deploy_key`.

#### Add the SSH key to your Git hosted account

##### Add the SSH key to Github

Open the `git_deploy_key.pub` file (public key) and copy the entire content.

In Github **Settings**, click on **SSH and GPG keys** in the sidebar, then on the **New SSH Key** button.

Paste the entire content of `git_deploy_key.pub` file (public key) and click the **Add SSH Key** button.

Delete the `git_deploy_key.pub` file:

```bash
$ rm git_deploy_key.pub
```

See [Adding a new SSH key to your GitHub account](https://help.github.com/articles/adding-a-new-ssh-key-to-your-github-account/) for more details.

#### Add the SSH private key to your CI environment

Make the private key available on the CI environment. Encrypt the key, commit it to your repository and configure the CI environment to decrypt it.

##### Add the SSH private key to Travis CI

Install the [Travis CLI](https://github.com/travis-ci/travis.rb#installation):

```bash
$ gem install travis
```

[Login](https://github.com/travis-ci/travis.rb#login) to Travis with the CLI:

```bash
$ travis login
```

Add the [environment](https://github.com/travis-ci/travis.rb#env) variable `SSH_PASSPHRASE` to Travis with the value set during the [SSH keys generation](#generate-the-ssh-keys) step:

```bash
$ travis env set SSH_PASSPHRASE <ssh_passphrase> 
```

[Encrypt](https://github.com/travis-ci/travis.rb#encrypt) the `git_deploy_key` (private key) using a symmetric encryption (AES-256), and store the secret in a secure environment variable in the Travis environment:

```bash
$ travis encrypt-file git_deploy_key
```

The `travis encrypt-file` will encrypt the private key into the `git_deploy_key.enc` file and output in the console the command to add to your `.travis.yml` file. It should look like `openssl aes-256-cbc -K $encrypted_AAAAAAAAAAAA_key -iv $encrypted_BBBBBBBBBBBB_iv -in git_deploy_key.enc -out git_deploy_key -d`.

Copy this command to your `.travis.yml` file in the `before_install` step. Change the output path to write the unencrypted key in `/tmp`: `-out git_deploy_key` => `/tmp/git_deploy_key`. This will avoid to commit / modify / delete the unencrypted key by mistake on the CI. Then add the commands to decrypt the ssh private key and make it available to `git`:

```yaml
before_install:
  # Decrypt the git_deploy_key.enc key into /tmp/git_deploy_key
  - openssl aes-256-cbc -K $encrypted_AAAAAAAAAAAA_key -iv $encrypted_BBBBBBBBBBBB_iv -in git_deploy_key.enc -out /tmp/git_deploy_key -d
  # Make sure only the current user can read the private key
  - chmod 600 /tmp/git_deploy_key
  # Create a script to return the passphrase environment variable to ssh-add
  - echo 'echo ${SSH_PASSPHRASE}' > /tmp/askpass && chmod +x /tmp/askpass
  # Start the authentication agent
  - eval "$(ssh-agent -s)"
  # Add the key to the authentication agent
  - DISPLAY=":0.0" SSH_ASKPASS="/tmp/askpass" setsid ssh-add /tmp/git_deploy_key </dev/null
```

See [Encrypting Files](https://docs.travis-ci.com/user/encrypting-files/) for more details.

Delete the local private key as it won't be used anymore:

```bash
$ rm git_deploy_key
```

Commit the encrypted private key and the `.travis.yml` file to your repository:

```bash
$ git add git_deploy_key.enc .travis.yml
$ git commit -m "ci(travis): Add the encrypted private ssh key"
$ git push
```
