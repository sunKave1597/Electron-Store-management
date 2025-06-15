document.addEventListener('DOMContentLoaded', () => {
    const loginButton = document.getElementById('loginButton');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorMessageParagraph = document.getElementById('errorMessage');

    if (loginButton) {
        loginButton.addEventListener('click', () => {
            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();

            if (!username || !password) {
                errorMessageParagraph.textContent = 'ชื่อผู้ใช้และรหัสผ่านต้องไม่ว่างเปล่า'; // Username and password cannot be empty.
                return;
            }

            errorMessageParagraph.textContent = ''; // Clear any previous error

            window.electronAPI.loginUser({ username, password })
                .then(result => {
                    if (result.success) {
                        console.log('Login successful, role:', result.role);
                        window.location.href = 'menu.html'; // Redirect to menu page
                    } else {
                        errorMessageParagraph.textContent = result.message || 'เกิดข้อผิดพลาด ao_e'; // Login failed
                    }
                })
                .catch(err => {
                    console.error('IPC Login Error:', err);
                    errorMessageParagraph.textContent = 'เกิดข้อผิดพลาดในการสื่อสารกับระบบหลัก'; // Error communicating with the main process
                });
        });
    } else {
        console.error('Login button not found. Check IDs in login.html.');
    }
});
