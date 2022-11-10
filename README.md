# Edith

A thin self-hostable CI/CD wrapper around Pachyderm/Kubernetes that helps a tiny (1-20 members) startup not think about setting up something as elaborate as Jenkins, ArgoCD and Airflow to keep a cluster delivering value

DISCLAIMER: This tool encapsulates what could be considered "best practices" for... bad practices. 

Background: 

As a hipster sys-admin developer advocate, lurking on cloud-native, with an M1 macbook, I hit a severe roadblock being unable to build containers for x86_64 for use in cloud environments, most of which wouldn't accept an arm build, to overcome the same, `Edith` was created as a CI stopgap until docker buildx caught up on m1, along the way, I discovered [Metacontroller](https://github.com/metacontroller/metacontroller) and [Pachyderm](https://github.com/pachyderm/pachyderm) and found myself being able to ship infrastructure pieces supafast, I call this pattern `Do this, then that` or `DTTT`

If none of this makes sense to you, much to learn you have, young padawan

## To setup:

Install dependencies with:

`npm i`

Compile ts to js:

`npx tsc`

Create an env file with the following: 

```
GITHUB_REPO=
GITHUB_TOKEN=
CONTAINER_REGISTRY=
SLACK_API_KEY=
DOCKERHUB_USERNAME=
DOCKERHUB_PASSWORD=
PUSHBULLET_API_KEY=
```


Run it with pm2 to auto-restart when updating:
`npm run pm2`

To develop:
`npm run start`

## Metacontroller setup

`kubectl apply -k https://github.com/metacontroller/metacontroller/manifests/production`


### TODO

[ ] Support `.env` 

[x] Find a way to compile prior to pm2 restarting the app after update

[x] Delete previous image tags in dockerhub

[x] Upload new container to dockerhub

[ ] Test all the containers under `/containers`

[x] Blog https://twitter.com/awsgeek/status/1108049045635776512?lang=en



### To Restart a Stuck Pipeline 

```
local RED='\e[31m';
  local DEF='\e[0m'

  local name=$1
  pachctl stop pipeline $name
  pachctl list commit __spec__@$name

  commits_to_delete=$(pachctl list commit __spec__@$name --raw  | jq -r "select(.subvenantCommitsSuccess==null) | select(.subvenantCommitsTotal) | .commit.id")
  echo "Commits to delete, please confirm"
  for i in $(echo "$commits_to_delete"); do
    echo $RED $i $DEF
  done
  read confirm

  for i in $(echo "$commits_to_delete"); do
    pachctl delete commit __spec__@$i
  done

  echo "Delete done, start pipeline?"
  read confirm
  pachctl start pipeline $name
```
