/**
 * Client-side UI state shared across the app shell (consultation dialog, menus).
 * Only ever mutated from event handlers in the browser, so it never leaks between
 * server-rendered requests.
 */
export type EnquiryContext = {
	interest?: string;
	project?: string;
	service?: string;
	heading?: string;
};

class UiState {
	consultationOpen = $state(false);
	consultationContext = $state<EnquiryContext>({});
	menuOpen = $state(false);

	openConsultation(context: EnquiryContext = {}) {
		this.consultationContext = context;
		this.consultationOpen = true;
		this.menuOpen = false;
	}
	closeConsultation() {
		this.consultationOpen = false;
	}
}

export const ui = new UiState();
