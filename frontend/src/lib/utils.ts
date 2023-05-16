export function asyncSleep(ms: number) {
	return new Promise<void>((resolve) => {
		setTimeout(() => {
			resolve();
		}, ms);
	});
}

export function isDeviceIOS() {
	const userAgent = navigator.userAgent;
	if (/iPad|iPhone|iPod/.test(userAgent)) return true;
	else return false;
}
