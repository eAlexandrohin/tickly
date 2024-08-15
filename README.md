# tickly
Twitch Command Line Interface
# Installation
```
npm i -g tickly
```
```
tickly auth
```
# Usage
```
tickly [command] [...args]
```
## Commands
```
  tickly.js                            returns followed live streams   [default]
  tickly.js auth                       change account or reauth
  tickly.js live [username]            returns data about [username] stream     
  tickly.js user [username]            returns data about [username]
  tickly.js follows                    returns your follows
  tickly.js following <from> <to>      returns boolean if <from> follows <to>   
  tickly.js team <team>                returns data about <team>
  tickly.js member <username>          returns teams which <username> is part of
  tickly.js directory <dirname>        returns streams from <dirname> directory 
  tickly.js top                        returns top streams
  tickly.js clip <links|ids..>         returns data about specified clips       
  tickly.js clips [username] [amount]  returns clips
  tickly.js vod <links|ids..>          returns data about specified vods        
  tickly.js vods [username] [amount]   returns vods
  tickly.js about
```
## Examples
```
  live        [username] --- [category] --- [uptime] --- [viewercount]
                >>>[title]
  user        [id] --- [username][partner] --- [followercount] --- [created at] --- [viewcount]
  follows     [#]       [follow] --- [followed at] --- [followage]
  following   [boolean] --- [from] >>> [to] --- [followed at] --- [followage]
  team        [name] --- [created at] ::: [createage] >>> [updated at] ::: [updateage]
  member      [#]       [team] --- [created at] ::: [createage] >>> [updated at] ::: [updateage]
  directory   [username] --- [uptime] --- [viewercount]
                >>>[title]
  top         [#]       [username] --- [category] --- [uptime] --- [viewercount]
                >>>[title]
  clip/clips  [#]       <<<[id]
              [username] --- [category] --- [created at] --- [createage] --- [duration] --- [viewcount]
                        >>>[title]
  vod/vods    [#]       <<<[id]
              [username] --- [started at] --- [startedage] --- [duration] --- [viewcount]
                        >>>[title]
```
## Auth 
```
[$HOME]|[%USERPROFILE%]/Documents/tickly
```
