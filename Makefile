all: build deploy

build:
	yarn build

deploy:
	cdk deploy
