import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../services/api_service.dart';

class QrScanScreen extends StatefulWidget {
  const QrScanScreen({super.key});

  @override
  State<QrScanScreen> createState() => _QrScanScreenState();
}

class _QrScanScreenState extends State<QrScanScreen> {
  final ApiService _apiService = ApiService();
  bool _isProcessing = false;

  void _onDetect(BarcodeCapture capture) async {
    if (_isProcessing) return;
    
    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;

    final String? code = barcodes.first.rawValue;
    if (code == null || code.isEmpty) return;

    setState(() {
      _isProcessing = true;
    });

    // Verify token with servers
    final result = await _apiService.verifyScannedQR(code, autoReturn: true);

    if (!mounted) return;

    if (result != null && result['success'] == true) {
      final String msg = result['message'] ?? 'Successfully verified gatepass!';
      final Map<String, dynamic>? issuance = result['issuance'];
      final String student = issuance != null ? (issuance['student']?['name'] ?? 'Scholar') : 'Scholar';
      final String eq = issuance != null ? (issuance['equipment']?['name'] ?? 'Equipment') : 'Gear';
      final int qty = issuance != null ? (issuance['quantity'] ?? 1) : 1;

      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          backgroundColor: const Color(0xFF161920),
          title: const Row(
            children: [
              Icon(Icons.check_circle_rounded, color: Colors.green),
              SizedBox(width: 8),
              Text('Gatepass Verified', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ],
          ),
          content: Text(
            '$msg\n\nStudent: $student\nEquipment: $eq (x$qty)\n\nChecked-In and stock updated.',
            style: const TextStyle(color: Colors.grey, height: 1.4),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                setState(() {
                  _isProcessing = false;
                });
              },
              child: const Text('OK', style: TextStyle(color: Colors.red)),
            )
          ],
        ),
      );
    } else {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          backgroundColor: const Color(0xFF161920),
          title: const Row(
            children: [
              Icon(Icons.error_rounded, color: Colors.red),
              SizedBox(width: 8),
              Text('Verification Failed', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ],
          ),
          content: const Text(
            'The scanned QR code is either invalid, expired, or has already been checked-in previously.',
            style: TextStyle(color: Colors.grey, height: 1.4),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                setState(() {
                  _isProcessing = false;
                });
              },
              child: const Text('Scan Again', style: TextStyle(color: Colors.red)),
            )
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('Laster Scanning Console', style: TextStyle(color: Colors.white)),
        backgroundColor: const Color(0xFF161920),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Stack(
        children: [
          MobileScanner(
            onDetect: _onDetect,
          ),
          // Scanner UI Frame Overlay
          Center(
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.red, width: 2.5),
                borderRadius: BorderRadius.circular(24),
              ),
              child: const Align(
                alignment: Alignment.center,
                child: Divider(
                  color: Colors.red,
                  thickness: 1.5,
                ),
              ),
            ),
          ),
          Positioned(
            bottom: 48,
            left: 24,
            right: 24,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.black80,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text(
                'Hold the university portal check out QR inside the bounding box to scan details.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white70, fontSize: 12),
              ),
            ),
          )
        ],
      ),
    );
  }
}
