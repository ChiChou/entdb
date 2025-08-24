#!/bin/zsh
ls output > list
mv list output/
pushd output
tar -cvzf ../iOS.tar.gz *
popd

gh release upload initial iOS.tar.gz --clobber
