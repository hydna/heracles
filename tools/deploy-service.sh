NAME="heracles"
BRANCH="master"
USER="heracles"
HOST="31.222.162.17"

git archive --format=tar --prefix=$NAME/ $BRANCH | gzip | ssh $USER@$HOST "tar xvz -C ~/ && supervisorctl restart heracles"
