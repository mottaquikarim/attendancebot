#!/bin/sh

# -t TASKNAME, ie: name of the task
# -c CRON, ie: cron frequency

BIN=$(npm bin)

# Grab options from cmd line
while getopts t:a:w:c: option
do
 case "${option}"
 in
 t) TASKNAME=${OPTARG};;
 c) CRON=$OPTARG;;
 esac
done

# our options are required
if [ -z ${TASKNAME+x} ] ; then echo "TASKNAME is unset" && exit 0; fi
if [ -z ${CRON+x} ] ; then echo "CRON is unset" && exit 0; fi

# if no secrets file, not much left to do
if [ ! -f .secrets.txt ]; then echo ".secrets.txt file not found, copy fro .secrets.txt.sample" && exit 0; fi

# actual deployment here
echo "1. Transpiling ES6 down to ES5..."
$BIN/babel index.js -o build.js
echo "2. Setting up CRON job $TASKNAME for $CRON..."
$BIN/wt cron create ./build.js --name $TASKNAME --secrets-file .secrets.txt --schedule "$CRON" --tz EST --bundle-minify
echo "3. Opening edit mode in browser..."
$BIN/wt edit $TASKNAME
