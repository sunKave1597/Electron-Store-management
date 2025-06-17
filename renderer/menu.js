document.addEventListener('DOMContentLoaded', async () => {
    const storeButton = document.getElementById('storeButton');
    const stockButton = document.getElementById('stockButton');
    const incomeButton = document.getElementById('incomeButton');
    const expenseButton = document.getElementById('expenseButton');
    const reportButton = document.getElementById('reportButton');
    const logoutButton = document.getElementById('logoutButton');
    const errorMessageParagraph = document.getElementById('errorMessage');

    if (!window.electronAPI) {
        console.error('Electron API not found! Check preload.js');
        if (errorMessageParagraph) errorMessageParagraph.textContent = 'เกิดข้อผิดพลาด: ไม่สามารถโหลด Electron API';
        return;
    }

    // Utility to handle navigation and error messages
    async function handleNavigation(page) {
        try {
            if (errorMessageParagraph) errorMessageParagraph.textContent = ''; // Clear previous errors
            const result = await window.electronAPI.navigateToPage(page);
            if (result && !result.success && result.message) {
                if (errorMessageParagraph) errorMessageParagraph.textContent = result.message;
                console.warn(`Navigation to ${page} denied: ${result.message}`);
            } else if (result && result.redirected) {
                console.log(`Redirected to ${result.target}`);
                // No need to do anything else, main process handled redirection.
            }
        } catch (error) {
            console.error(`Error navigating to ${page}:`, error);
            if (errorMessageParagraph) errorMessageParagraph.textContent = `เกิดข้อผิดพลาดในการนำทาง: ${error.message}`;
        }
    }

    // Check user session
    try {
        const session = await window.electronAPI.getCurrentUserSession();
        console.log('Session in menu.js:', session);

        if (!session || !session.username) {
            console.log('No active session, redirecting to login.');
            await handleNavigation('login.html');
            return; // Stop further execution in this script
        }

        if (session.role === 'staff') {
            console.log('User is staff, hiding restricted buttons.');
            if (incomeButton) incomeButton.style.display = 'none';
        }
    } catch (error) {
        console.error('Error getting user session:', error);
        if (errorMessageParagraph) errorMessageParagraph.textContent = 'เกิดข้อผิดพลาดในการตรวจสอบเซสชัน';
        // Potentially redirect to login if session check fails critically
        // await handleNavigation('login.html'); 
        return;
    }

    // Navigation button event listeners
    if (storeButton) storeButton.addEventListener('click', () => handleNavigation('store.html'));
    if (stockButton) stockButton.addEventListener('click', () => handleNavigation('stock.html'));
    if (incomeButton) incomeButton.addEventListener('click', () => handleNavigation('income.html'));
    if (expenseButton) expenseButton.addEventListener('click', () => handleNavigation('expense.html'));
    if (reportButton) reportButton.addEventListener('click', () => handleNavigation('report.html'));

    // Logout button event listener
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                if (errorMessageParagraph) errorMessageParagraph.textContent = ''; // Clear previous errors
                const result = await window.electronAPI.logoutUser();
                if (result.success) {
                    console.log('Logout successful, redirecting to login.');
                    await handleNavigation('login.html');
                } else {
                    console.error('Logout failed.');
                    if (errorMessageParagraph) errorMessageParagraph.textContent = 'การออกจากระบบล้มเหลว';
                }
            } catch (error) {
                console.error('Error during logout:', error);
                if (errorMessageParagraph) errorMessageParagraph.textContent = 'เกิดข้อผิดพลาดระหว่างการออกจากระบบ';
            }
        });
    }
});
