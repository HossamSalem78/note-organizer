import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { User } from '../models/user.interface';

export interface AuthResponse {
  success: boolean;
  user?: User;
  message?: string;
}

export interface RegisterResponse {
  success: boolean;
  user?: User;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/users';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    // Initialize current user from localStorage on service creation
    this.loadUserFromStorage();
  }

  /**
   * Login user with email and password
   */
  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.get<User[]>(`${this.apiUrl}?email=${email}&password=${password}`).pipe(
      map(users => {
        if (users.length > 0) {
          const user = users[0];
          // Store user in localStorage and update current user
          this.setCurrentUser(user);
          return {
            success: true,
            user: user,
            message: 'Login successful'
          };
        } else {
          return {
            success: false,
            message: 'Invalid email or password'
          };
        }
      }),
      catchError(error => {
        console.error('Login error:', error);
        return throwError(() => new Error('Login failed. Please try again.'));
      })
    );
  }

  /**
   * Register new user
   */
  register(userData: { email: string; firstName: string; lastName: string; dateOfBirth: string; password: string }): Observable<RegisterResponse> {
    console.log('Registration attempt with data:', userData);
    
    // First check if email already exists
    return this.http.get<User[]>(`${this.apiUrl}?email=${userData.email}`).pipe(
      switchMap(existingUsers => {
        console.log('Existing users check:', existingUsers);
        if (existingUsers.length > 0) {
          return of({
            success: false,
            message: 'Email already exists'
          });
        }
        // If email is available, create new user
        return this.createNewUser(userData);
      }),
      catchError(error => {
        console.error('Registration error details:', error);
        return throwError(() => new Error('Registration failed. Please try again.'));
      })
    );
  }

  /**
   * Create new user in database
   */
  private createNewUser(userData: { email: string; firstName: string; lastName: string; dateOfBirth: string; password: string }): Observable<RegisterResponse> {
    const newUser: User = {
      id: Date.now(), // Generate unique ID
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      dateOfBirth: userData.dateOfBirth,
      password: userData.password
    };

    console.log('Creating new user:', newUser);

    return this.http.post<User>(this.apiUrl, newUser).pipe(
      map(user => {
        console.log('User created successfully:', user);
        // Store user in localStorage and update current user
        this.setCurrentUser(user);
        return {
          success: true,
          user: user,
          message: 'Registration successful'
        };
      }),
      catchError(error => {
        console.error('Create user error details:', error);
        return throwError(() => new Error('Registration failed. Please try again.'));
      })
    );
  }

  /**
   * Simple register method as requested
   */
  registerSimple(username: string, password: string): Observable<User> {
    return this.http.get<User[]>(`${this.apiUrl}?username=${username}`).pipe(
      switchMap(users => {
        if (users.length > 0) {
          return throwError(() => new Error('Username already exists'));
        }
        const newUser = { username, password };
        return this.http.post<User>(this.apiUrl, newUser);
      }),
      tap(user => {
        localStorage.setItem('user', JSON.stringify(user));
        this.currentUserSubject.next(user);
      }),
      catchError(err => throwError(() => err))
    );
  }

  /**
   * Logout current user
   */
  logout(): void {
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  /**
   * Get current logged-in user
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Set current user and store in localStorage
   */
  private setCurrentUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  /**
   * Load user from localStorage on service initialization
   */
  private loadUserFromStorage(): void {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        this.currentUserSubject.next(user);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
      }
    }
  }

  /**
   * Update user profile
   */
  updateProfile(user: User): Observable<AuthResponse> {
    return this.http.put<User>(`${this.apiUrl}/${user.id}`, user).pipe(
      map(updatedUser => {
        this.setCurrentUser(updatedUser);
        return {
          success: true,
          user: updatedUser,
          message: 'Profile updated successfully'
        };
      }),
      catchError(error => {
        console.error('Profile update error:', error);
        return throwError(() => new Error('Failed to update profile.'));
      })
    );
  }

  /**
   * Change password
   */
  changePassword(userId: number, newPassword: string): Observable<AuthResponse> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return throwError(() => new Error('No user logged in.'));
    }

    const updatedUser = { ...currentUser, password: newPassword };

    return this.http.put<User>(`${this.apiUrl}/${userId}`, updatedUser).pipe(
      map(user => {
        this.setCurrentUser(user);
        return {
          success: true,
          user: user,
          message: 'Password changed successfully'
        };
      }),
      catchError(error => {
        console.error('Password change error:', error);
        return throwError(() => new Error('Failed to change password.'));
      })
    );
  }

  /**
   * Delete user account
   */
  deleteAccount(userId: number): Observable<AuthResponse> {
    return this.http.delete<void>(`${this.apiUrl}/${userId}`).pipe(
      map(() => {
        this.logout();
        return {
          success: true,
          message: 'Account deleted successfully'
        };
      }),
      catchError(error => {
        console.error('Account deletion error:', error);
        return throwError(() => new Error('Failed to delete account.'));
      })
    );
  }
} 