#!/bin/bash
lib_path="public/tracker.min.js"
version="2"

# don't edit below this line

if [ -z "$CDN_API_USER" ]; then
    echo "You must set \$CDN_API_USER";
    exit 1;
fi

if [ -z "$CDN_API_KEY" ]; then
    echo "You must set \$CDN_API_KEY";
    exit 1;
fi

function putfile() {
    local path=$1
    local filename=$2
    local ctype=$3

    local md5=`cat $path | md5`

    curl -s -X PUT -T $path -H "ETag: $md5" -H "Content-type: $ctype" -H "X-Auth-Token: $token" "$storage/cdn/$version/$filename" > /dev/null
}

auth_server="https://lon.auth.api.rackspacecloud.com/v1.0"

data=`curl -s -f -D - \
           -H "X-Auth-User: $CDN_API_USER" \
           -H "X-Auth-Key: $CDN_API_KEY" \
           $auth_server`
token=`echo "$data" | grep "X-Auth-Token:" | awk '{print $2}'`
storage=`echo "$data" | grep "X-Storage-Url:" | awk '{print $2}' | tr -d '\r'`

putfile $lib_path "atlasio.js" "application/javascript"
