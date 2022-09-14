# Edith

## To setup:

Install dependencies with:

`npm i`

Compile ts to js:

`npx tsc`

Create an env file with the following: 



Run it with pm2 to auto-restart when updating:
`npm run pm2`

To develop:
`npm run start`

## Metacontroller setup

`kubectl apply -k https://github.com/metacontroller/metacontroller/manifests/production`


### TODO

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