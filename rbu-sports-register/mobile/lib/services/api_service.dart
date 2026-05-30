import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  final Dio _dio = Dio();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  
  // Base API URL default to local docker network or android emulator loopback
  final String baseUrl = 'http://10.0.2.2/api/v1'; 

  ApiService() {
    _dio.options.baseUrl = baseUrl;
    _dio.options.connectTimeout = const Duration(seconds: 5);
    _dio.options.receiveTimeout = const Duration(seconds: 3);

    // Attach Interceptor for token injection
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.read(key: 'jwt_token');
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
      ),
    );
  }

  // Authentication Login
  Future<bool> login(String email, String password) async {
    try {
      final response = await _dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });

      if (response.statusCode == 200) {
        final token = response.data['access_token'];
        await _storage.write(key: 'jwt_token', value: token);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  // Verify scanned gatepass token
  Future<Map<String, dynamic>?> verifyScannedQR(String token, {bool autoReturn = true}) async {
    try {
      final response = await _dio.post('/qr/verify-scan', data: {
        'token': token,
        'auto_return': autoReturn,
      });

      if (response.statusCode == 200) {
        return response.data;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // Terminate secure store session
  Future<void> logout() async {
    await _storage.delete(key: 'jwt_token');
  }
}
