# build-apk.ps1 - Conversor Simples para APK
# Execute na pasta do FAFANET2FA

Write-Host "=== FAFANET2FA PARA APK ===" -ForegroundColor Cyan
Write-Host "Criando projeto Android..." -ForegroundColor Yellow

# Configurações
$APP_NAME = "FAFANET 2FA"
$APP_ID = "com.fafanet.twofa"

# 1. Criar estrutura de pastas
Write-Host "`n[1/6] Criando estrutura de pastas..." -ForegroundColor Yellow

$folders = @(
    "android\app\src\main\assets",
    "android\app\src\main\res\layout",
    "android\app\src\main\res\mipmap-hdpi",
    "android\app\src\main\res\mipmap-mdpi",
    "android\app\src\main\res\mipmap-xhdpi",
    "android\app\src\main\res\mipmap-xxhdpi",
    "android\app\src\main\java\com\fafanet\twofa"
)

foreach ($folder in $folders) {
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
    }
}
Write-Host "  ✓ Pastas criadas" -ForegroundColor Green

# 2. Copiar arquivos do projeto
Write-Host "`n[2/6] Copiando arquivos do projeto..." -ForegroundColor Yellow

# Primeiro limpar assets se existir
if (Test-Path "android\app\src\main\assets") {
    Remove-Item "android\app\src\main\assets\*" -Recurse -Force -ErrorAction SilentlyContinue
}

# Copiar arquivos (exceto os desnecessários)
$exclude = @("node_modules", "android", "*.ps1", "capacitor.config.*", ".git", "dist", "build")
Get-ChildItem -Path "." -Exclude $exclude | 
    Copy-Item -Destination "android\app\src\main\assets\" -Recurse -Force

$fileCount = (Get-ChildItem "android\app\src\main\assets\" -Recurse -File).Count
Write-Host "  ✓ $fileCount arquivos copiados" -ForegroundColor Green

# 3. Criar ícones
Write-Host "`n[3/6] Configurando ícones..." -ForegroundColor Yellow

if (Test-Path "icon.png") {
    # Copiar icon.png para todas as resoluções
    $sizes = @("hdpi", "mdpi", "xhdpi", "xxhdpi", "xxxhdpi")
    foreach ($size in $sizes) {
        Copy-Item "icon.png" -Destination "android\app\src\main\res\mipmap-$size\ic_launcher.png" -Force -ErrorAction SilentlyContinue
    }
    Write-Host "  ✓ Ícone personalizado configurado" -ForegroundColor Green
} else {
    Write-Host "  ⓘ Ícone padrão será usado (adicione icon.png)" -ForegroundColor Yellow
}

# 4. Criar arquivos Android ESSENCIAIS
Write-Host "`n[4/6] Criando arquivos de configuração..." -ForegroundColor Yellow

# 4.1 AndroidManifest.xml
@'
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.fafanet.twofa">

    <uses-permission android:name="android.permission.INTERNET" />
    
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="FAFANET 2FA"
        android:theme="@style/Theme.AppCompat.Light.NoActionBar"
        android:usesCleartextTraffic="true">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
        
    </application>

</manifest>
'@ | Out-File "android\app\src\main\AndroidManifest.xml" -Encoding UTF8

# 4.2 MainActivity.java
@'
package com.fafanet.twofa;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {
    
    private WebView webView;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        webView = findViewById(R.id.webView);
        
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        
        webView.loadUrl("file:///android_asset/index.html");
    }
    
    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
'@ | Out-File "android\app\src\main\java\com\fafanet\twofa\MainActivity.java" -Encoding UTF8

# 4.3 activity_main.xml (layout)
@'
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical">

    <WebView
        android:id="@+id/webView"
        android:layout_width="match_parent"
        android:layout_height="match_parent" />

</LinearLayout>
'@ | Out-File "android\app\src\main\res\layout\activity_main.xml" -Encoding UTF8

# 4.4 build.gradle (app)
@'
apply plugin: 'com.android.application'

android {
    namespace 'com.fafanet.twofa'
    compileSdk 34
    
    defaultConfig {
        applicationId "com.fafanet.twofa"
        minSdk 21
        targetSdk 34
        versionCode 1
        versionName "1.0"
    }
    
    buildTypes {
        release {
            minifyEnabled false
        }
        debug {
            debuggable true
        }
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
}
'@ | Out-File "android\app\build.gradle" -Encoding UTF8

# 4.5 build.gradle (project)
@'
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.1.2'
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}
'@ | Out-File "android\build.gradle" -Encoding UTF8

# 4.6 settings.gradle
"include ':app'" | Out-File "android\settings.gradle" -Encoding UTF8

# 4.7 gradle.properties
@'
org.gradle.jvmargs=-Xmx2048m
android.useAndroidX=true
'@ | Out-File "android\gradle.properties" -Encoding UTF8

Write-Host "  ✓ 7 arquivos de configuração criados" -ForegroundColor Green

# 5. Criar polyfills.js para adaptar código
Write-Host "`n[5/6] Criando adaptador para Android..." -ForegroundColor Yellow

@'
// polyfills.js - Para fazer código Electron funcionar no Android
// Adicione no index.html: <script src="polyfills.js"></script>

if (typeof window.require === 'undefined') {
    window.require = function(module) {
        console.log('Polyfill require: ' + module);
        return {
            ipcRenderer: {
                send: function() { console.log('ipcRenderer.send'); },
                on: function() { console.log('ipcRenderer.on'); }
            }
        };
    };
}

if (typeof window.process === 'undefined') {
    window.process = {
        platform: 'android',
        versions: { node: '16.0.0' }
    };
}

console.log('FAFANET 2FA pronto para Android!');
'@ | Out-File "android\app\src\main\assets\polyfills.js" -Encoding UTF8

# Também salvar na raiz
@'
// polyfills-android.js
// Adicione esta linha ao seu index.html ANTES de outros scripts:
// <script src="polyfills.js"></script>

console.log('Adaptador Android carregado');
'@ | Out-File "polyfills-android.js" -Encoding UTF8

Write-Host "  ✓ Adaptador criado (polyfills.js)" -ForegroundColor Green

# 6. Instruções finais
Write-Host "`n[6/6] Concluído!" -ForegroundColor Green
Write-Host "=" * 50 -ForegroundColor Cyan

Write-Host "`n✅ PROJETO ANDROID CRIADO EM: android\" -ForegroundColor Green

Write-Host "`n📱 PRÓXIMOS PASSOS:" -ForegroundColor White
Write-Host "1. Adicione no seu index.html:" -ForegroundColor Cyan
Write-Host "   <script src='polyfills.js'></script>" -ForegroundColor Gray
Write-Host "   (Primeira linha após <head> ou antes de outros scripts)" -ForegroundColor DarkGray

Write-Host "`n2. Abra a pasta 'android' no Android Studio:" -ForegroundColor Cyan
Write-Host "   • File → Open → Selecione pasta 'android'" -ForegroundColor Gray
Write-Host "   • Aguarde o Gradle sincronizar" -ForegroundColor Gray
Write-Host "   • Build → Build Bundle(s) / APK(s) → Build APK(s)" -ForegroundColor Gray

Write-Host "`n3. Se não tem Android Studio, use o APK já criado:" -ForegroundColor Cyan
if (Test-Path "android\app\build\outputs\apk\debug\app-debug.apk") {
    Copy-Item "android\app\build\outputs\apk\debug\app-debug.apk" -Destination "FAFANET2FA.apk" -Force
    Write-Host "   • APK disponível: FAFANET2FA.apk" -ForegroundColor Green
} else {
    Write-Host "   • Execute no Android Studio para gerar APK" -ForegroundColor Yellow
}

Write-Host "`n⚠ IMPORTANTE: Ajuste seu código para Android:" -ForegroundColor Yellow
Write-Host "• Substitua require() do Electron por imports web" -ForegroundColor DarkYellow
Write-Host "• Use localStorage em vez de arquivos do sistema" -ForegroundColor DarkYellow
Write-Host "• Teste no navegador primeiro com F12 → Modo Celular" -ForegroundColor DarkYellow

Write-Host "`n🎯 Para testar no celular:" -ForegroundColor White
Write-Host "1. Ative 'Depuração USB' no celular" -ForegroundColor Gray
Write-Host "2. Conecte via USB" -ForegroundColor Gray
Write-Host "3. Instale: adb install FAFANET2FA.apk" -ForegroundColor Gray

Write-Host "`nPressione Enter para sair..." -ForegroundColor Gray
Read-Host