# @semantic-release/git

Set of [Semantic-release](https://github.com/semantic-release/semantic-release) plugins for publishing to a [git](https://git-scm.com/) repository.

[![Travis](https://img.shields.io/travis/semantic-release/git.svg)](https://travis-ci.org/semantic-release/git)
[![Codecov](https://img.shields.io/codecov/c/github/semantic-release/git.svg)](https://codecov.io/gh/semantic-release/git)
[![Greenkeeper badge](https://badges.greenkeeper.io/semantic-release/git.svg)](https://greenkeeper.io/)

## verifyConditions

Verify the access to the remote Git repository, the commit `message` format and the `assets` option configuration.

## getLastRelease

Determine the Git tag and version of the last tagged release.

## publish

Publish a release commit, including configurable files.

## Configuration

### Git repository authentication

The `Git` authentication configuration is **required** and can be set either:
- with the [`GIT_CREDENTIALS` environment variable](#environment-variables) for accessing the repository via [https](https://git-scm.com/book/en/v2/Git-on-the-Server-The-Protocols#_the_http_protocols)
- or with [ssh keys](#set-up-the-ssh-keys) to access via [ssh](https://git-scm.com/book/en/v2/Git-on-the-Server-The-Protocols#_the_ssh_protocol)

If the `GIT_CREDENTIALS` environment variable is set, the remote Git repository will automatically be accessed via `https`, independently of the `repositoryUrl` format configured in the Semantic-release (the format will be automatically converted as needed).

Using the `GIT_CREDENTIALS` environment variable is the recommended configuration.

`GIT_CREDENTIALS` can be your Git username and password in the format `<username>:<password>` or a token for certain Git providers like [GitHub](https://help.github.com/articles/creating-a-personal-access-token-for-the-command-line/), [Bitbucket](https://confluence.atlassian.com/bitbucketserver/personal-access-tokens-939515499.html) or [GitLab](https://docs.gitlab.com/ce/user/profile/personal_access_tokens.html).

If the `GH_TOKEN` or `GITHUB_TOKEN` environment variables are defined their value will be used as a replacement for `GIT_CREDENTIALS`.

For GitLab the`GIT_CREDENTIALS` value has to be set with `gitlab-ci-token:<personal_access_tokens>`.

### Environment variables

| Variable          | Description                                                                                                                                 | Default                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `GIT_CREDENTIALS` | [URL encoded basic HTTP Authentication](https://en.wikipedia.org/wiki/Basic_access_authentication#URL_encoding) credentials).               | `GH_TOKEN` or `GITHUB_TOKEN` environment variables. |
| `GIT_USERNAME`    | [Git username](https://git-scm.com/book/en/v2/Getting-Started-First-Time-Git-Setup#_your_identity) associated with the release commit.      | @semantic-release-bot.                              |
| `GIT_EMAIL`       | [Git email address](https://git-scm.com/book/en/v2/Getting-Started-First-Time-Git-Setup#_your_identity) associated with the release commit. | @semantic-release-bot email address.                |

### Options

| Options        | Description                                                    | Default                                                                     |
| -------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `message`      | The message for the release commit. See [message](#message).   | `chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}`  |
| `assets`       | Files to include in the release commit. See [assets](#assets). | `["package.json", "npm-shrinkwrap.json"]`                                   |

#### `message`

The message for the release commit is generated with [Lodash template](https://lodash.com/docs#template). The following variables are available:

| Parameter     | Description                                                                         |
|---------------|-------------------------------------------------------------------------------------|
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

Options can be set within the plugin definition in the Semantic-release configuration file:

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

When using with the [changelog](https://github.com/semantic-release/changelog), [npm](https://github.com/semantic-release/npm) or [github](https://github.com/semantic-release/github) plugins:
- The [changelog](https://github.com/semantic-release/changelog) plugin must be called first in order to update the changelog file so the [git](https://github.com/semantic-release/git) and [npm](https://github.com/semantic-release/npm) plugin can include it in the release.
- The [npm](https://github.com/semantic-release/npm) plugin must be called second in order to update the `package.json` file so the [git](https://github.com/semantic-release/git) plugin can include it in the release commit.
- The [github](https://github.com/semantic-release/github) plugin must be called last to create a [GitHub Release](https://help.github.com/articles/about-releases/) that reference the tag created by the [git](https://github.com/semantic-release/git) plugin.

To use with the [changelog](https://github.com/semantic-release/changelog), [github](https://github.com/semantic-release/github) and [npm](https://github.com/semantic-release/npm) plugins:

```json
{
  "release": {
    "verifyConditions": ["@semantic-release/changelog", "@semantic-release/npm", "@semantic-release/git", "@semantic-release/github"],
    "getLastRelease": "@semantic-release/npm",
    "publish": ["@semantic-release/changelog", "@semantic-release/npm", "@semantic-release/git", "@semantic-release/github"]
  }
}
```

To use with [github](https://github.com/semantic-release/github):

```json
{
  "release": {
    "verifyConditions": ["@semantic-release/git", "@semantic-release/github"],
    "getLastRelease": "@semantic-release/git",
    "publish": ["@semantic-release/git", "@semantic-release/github"]
  }
}
```

### GPG signature

Using GPG, you can [sign and verify tags and commits](https://git-scm.com/book/id/v2/Git-Tools-Signing-Your-Work). With GPG keys, the release tags and commits made by Semantic-release are verified and other people can trust that they were really were made by your account.

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

##### Add the GPG key to GitHub

In GitHub **Settings**, click on **SSH and GPG keys** in the sidebar, then on the **New GPG Key** button.

Paste the entire GPG key export previously and click the **Add GPG Key** button.

See [Adding a new GPG key to your GitHub account](https://help.github.com/articles/adding-a-new-gpg-key-to-your-github-account/) for more details.

### Use the GPG key to sign commit and tags locally

If you want to use this GPG to also sign the commits and tags you create on your local machine you can follow the instruction at [Git Tools - Signing Your Work](https://git-scm.com/book/id/v2/Git-Tools-Signing-Your-Work)
This step is optional and unrelated to Semantic-release.

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
- `GIT_EMAIL` with the email address you set during the [GPG keys generation](#generate-the-gpg-keys) step
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

In order to allows Semantic-release to push commits to your repository from the CI, you need to geneate a SSH key, add it to your Git hosted account, make it available on the CI environment.

#### Generate the SSH keys

In your local repository root:

```bash
$ ssh-keygen -t rsa -b 4096 -C "<your_email>" -f git_deploy_key -N "<ssh_passphrase>"
```

`your_email` must be the email associated with your Git hosted account. `ssh_passphrase` must be a long and hard to guess string. It will be used later.

This will generate a public key in `git_deploy_key.pub` and a private key in `git_deploy_key`.

#### Add the SSH key to your Git hosted account

##### Add the SSH key to GitHub

Open the `git_deploy_key.pub` file (public key) and copy the entire content.

In GitHub **Settings**, click on **SSH and GPG keys** in the sidebar, then on the **New SSH Key** button.

Paste the entire content of `git_deploy_key.pub` file (public key) and click the **Add SSH Key** button.

Delete the `git_deploy_key.pub` file:

```bash
$ rm git_deploy_key.pub
```

See [Adding a new SSH key to your GitHub account](https://help.github.com/articles/adding-a-new-ssh-key-to-your-github-account/) for more details.

#### Add the SSH private key to your CI environment

Make the private key available on the CI environment. Encrypt the key, commit it to your repository and configure the CI environment to decrypt it.

Step by step instructions are provided for the following environments:

* [Travis CI](#add-the-ssh-private-key-to-travis-ci)
* [Circle CI](#add-the-ssh-private-key-to-circle-ci)

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

##### Add the SSH private key to Circle CI

First we encrypt the `git_deploy_key` (private key) using a symmetric encryption (AES-256).  Run the folllowing `openssl` command and *make sure to note the output which we'll need later*:

```bash
$ openssl aes-256-cbc -e -p -in git_deploy_key -out git_deploy_key.enc -K `openssl rand -hex 32` -iv `openssl rand -hex 16`
salt=SSSSSSSSSSSSSSSS
key=KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
iv =VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV
```

Add the following [environment variables](https://circleci.com/docs/2.0/env-vars/#adding-environment-variables-in-the-app) to Circle CI:

* `SSL_PASSPHRASE` - the value set during the [SSH keys generation](#generate-the-ssh-keys) step.
* `REPO_ENC_KEY` - the `key` (KKK) value from the `openssl` step above.
* `REPO_ENC_IV` - the `iv` (VVV) value from the `openssl` step above.

Adapt your `.circleci/config.yml` (API v2.0) as follows, in the `steps` section before `run: npm run semantic-release`:

```yaml
version: 2
jobs:
  coverage_test_publish:
    # docker, working_dir, etc
    steps:
      # checkout, restore_cache, run: yarn install, save_cache, etc.

      - run:
          name: Setup SSH with decrypted deploy key
          command: |
            # Decrypt the git_deploy_key.enc key into /tmp/git_deploy_key
            openssl aes-256-cbc -d -K $REPO_ENC_KEY -iv $REPO_ENC_IV -in git_deploy_key.enc -out /tmp/git_deploy_key
            # Make sure only the current user can read the private key
            chmod 600 /tmp/git_deploy_key
            # Create a script to return the passphrase environment variable to ssh-add
            echo 'echo ${SSH_PASSPHRASE}' > /tmp/askpass && chmod +x /tmp/askpass
            # Start the authentication agent
            eval "$(ssh-agent -s)"
            # Add the key to the authentication agent
            DISPLAY=":0.0" SSH_ASKPASS="/tmp/askpass" setsid ssh-add /tmp/git_deploy_key </dev/null

      # Run semantic-release after all the above is set.
      - run: npm run semantic-release
```

Note that we encrypt the key to `/tmp` to avoid commit / modify / delete the unencrypted key by mistake on the CI.

Delete the local private key as it won't be used anymore:

```bash
$ rm git_deploy_key
```

Commit the encrypted private key and the `.circleci/config.yml` file to your repository:

```bash
$ git add git_deploy_key.enc .circleci/config.yml
$ git commit -m "ci(cicle): Add the encrypted private ssh key"
$ git push
```
