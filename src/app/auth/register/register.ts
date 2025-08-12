import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  loading = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder, 
    private auth: AuthService, 
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email], [this.emailExistsValidator.bind(this)]],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      dateOfBirth: ['', [Validators.required, this.dateOfBirthValidator]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  // Custom validator to check if email already exists
  emailExistsValidator(control: AbstractControl) {
    if (!control.value) {
      return of(null);
    }
    
    return this.http.get<any[]>(`http://localhost:3000/users?email=${control.value}`).pipe(
      map(users => {
        return users.length > 0 ? { emailExists: true } : null;
      }),
      catchError(() => of(null))
    );
  }

  // Custom validator for date of birth (must be at least 13 years old)
  dateOfBirthValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }

    const birthDate = new Date(control.value);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 13) {
      return { tooYoung: true };
    }

    if (birthDate > today) {
      return { futureDate: true };
    }

    return null;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.loading = true;
    this.error = null;

    const formData = this.registerForm.value;

    this.auth.register(formData).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          // Navigate to notes page on successful registration
          this.router.navigate(['/notes']);
        } else {
          this.error = response.message || 'Registration failed';
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = err.message || 'Registration failed. Please try again.';
        console.error('Registration error:', err);
      }
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.registerForm.controls).forEach(key => {
      const control = this.registerForm.get(key);
      control?.markAsTouched();
    });
  }

  // Getter methods for easy template access
  get email() { return this.registerForm.get('email'); }
  get firstName() { return this.registerForm.get('firstName'); }
  get lastName() { return this.registerForm.get('lastName'); }
  get dateOfBirth() { return this.registerForm.get('dateOfBirth'); }
  get password() { return this.registerForm.get('password'); }
}
