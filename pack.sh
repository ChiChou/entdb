#!/bin/zsh
rm output/list
ls output > output/list
pushd output
tar -cvzf ../iOS.tar.gz *
popd

gh release upload initial iOS.tar.gz --clobber
