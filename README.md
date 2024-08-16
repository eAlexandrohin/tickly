# tickly
![tickly](../main/.github/logoLong.svg)
**tickly** (formely known as tCLI) is Twitch Command Line Interface, powered by Node.js, with native implementation of fetch, which provides swiftness and simplicity. 
Has all of Twitch's core functionality, as well as downloading clips and vods in a bulk.
## Preview
![tickly](../main/.github/img/preview.png)
# Installation
```
npm i -g tickley
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
  tickly                            returns followed live streams      [default]
  tickly auth                       change account or reauth
  tickly live [username]            returns data about [username] stream        
  tickly user [username]            returns data about [username]
  tickly follows                    returns your follows
  tickly following <from> <to>      returns boolean if <from> follows <to>      
  tickly team <team>                returns data about <team>
  tickly member <username>          returns teams which <username> is part of   
  tickly directory <dirname>        returns streams from <dirname> directory    
  tickly top                        returns top streams
  tickly clip <links|ids..>         returns data about specified clips
  tickly clips [username] [amount]  returns clips
  tickly vod <links|ids..>          returns data about specified vods
  tickly vods [username] [amount]   returns vods
  tickly about
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
## Configuration 
```
[$HOME]|[%USERPROFILE%]/Documents/tickly
```
