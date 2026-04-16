# Installing dlib and face_recognition on Windows

To enable the high-accuracy `face_recognition` engine (which depends on `dlib`), you have two main options on Windows.

## Option 1: Fast Installation (Pre-compiled Wheels)
This is the easiest method. It skips the compilation process by using a pre-made binary file.

1.  **Activate your virtual environment** in your terminal:
    ```powershell
    .\venv\Scripts\activate
    ```
2.  **Install CMake** (often required even with wheels):
    ```powershell
    pip install cmake
    ```
3.  **Install dlib** using a community-built wheel specifically for Python 3.13:
    ```powershell
    pip install https://github.com/z-mahmud22/Dlib_Windows_Python3.x/releases/download/v1/dlib-20.0.99-cp313-cp313-win_amd64.whl
    ```
4.  **Install face_recognition**:
    ```powershell
    pip install face_recognition
    ```

---

## Option 2: Professional Installation (Build from Source)
This is the most reliable method if the first option fails or if you need a specific version. It requires installing C++ compilers on your system.

### Step 1: Install Visual Studio Build Tools
1.  Download the **[Visual Studio Build Tools Installer](https://visualstudio.microsoft.com/visual-cpp-build-tools/)**.
2.  Run the installer and select the workload: **"Desktop development with C++"**.
3.  Ensure the following sub-components are checked on the right side:
    - `MSVC v143 - VS 2022 C++ x64/x86 build tools`
    - `Windows 10/11 SDK`
    - `C++ CMake tools for Windows`
4.  Click **Install** (this is a large download, ~2-5 GB).
5.  **Restart your computer** after the installation finishes.

### Step 2: Install the packages
Once the build tools are installed, you can simply run:
```powershell
pip install cmake
pip install dlib
pip install face_recognition
```

---

## Verification
To verify that everything is working, run:
```powershell
python -c "import face_recognition; print('Success!')"
```

> [!IMPORTANT]
> If you choose to stay with the current **OpenCV Fallback**, your system will still work perfectly fine! The code I analyzed is already designed to switch to OpenCV automatically if `face_recognition` is missing. The primary difference is that the `face_recognition` library (Option 1 & 2) provides much higher accuracy in low light or different angles.
