export default {
	ConnectionLevel: {
		DIRECT: 0,
		TURN: 1
	},

	RetryCondition: {
		NO_RETRY: 'no_retry',
		AFTER_FAILED: 'after_failed',
		AFTER_DISCONNECTED: 'after_disconnected',
		RIGHT_AFTER_DISCONNECTED: 'right_after_disconnected',
		BEFORE_DISCONNECTED: 'before_disconnected'
	}
};
