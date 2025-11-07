import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, AbstractControlOptions, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { Router } from '@angular/router';
import { CadastroService } from '../../shared/services/cadastro.service';
import { BehaviorSubject, Observable, of, startWith, switchMap, tap } from 'rxjs';
import { Cidade, Estado, IbgeService } from '../../shared/services/ibge.service';
import { cpfValidator } from '../../shared/validators/cpf.validator';

export const senhasIguaisValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null  => {
  const senha = control.get('senha');
  const confirmaSenha = control.get('confirmaSenha');

  if (senha && confirmaSenha && senha.value !== confirmaSenha.value) {
    return { senhasDiferentes: true };
  }
  return null;
};

@Component({
  selector: 'app-dados-pessoais-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent
  ],
  templateUrl: './dados-pessoais-form.component.html',
  styleUrls: ['./dados-pessoais-form.component.scss']
})
export class DadosPessoaisFormComponent implements OnInit {
  dadosPessoaisForm!: FormGroup;

  estado$!: Observable<Estado[]>;
  cidade$!: Observable<Cidade[]>;

  carregandoCidades$ = new BehaviorSubject<boolean>(false);

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private cadastroService: CadastroService,
    private ibgeService: IbgeService
  ) {}

  ngOnInit(): void {
    const formOptions: AbstractControlOptions = {
      validators: senhasIguaisValidator
    };

    this.dadosPessoaisForm = this.fb.group({
      nomeCompleto: ['', Validators.required],
      cpf: ['', [Validators.required, cpfValidator]],
      estado: ['', Validators.required],
      cidade: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required, Validators.minLength(6)]],
      confirmaSenha: ['', [Validators.required]]
    }, formOptions);

    this.carregarEstados();
    this.configurarListnerEstado();
  }

  onAnterior(): void {
    this.salvarDadosAtuais();
    this.router.navigate(['/cadastro/area-atuacao']);
  }

  onProximo(): void {
    if (this.dadosPessoaisForm.valid) {
      this.salvarDadosAtuais();
      this.router.navigate(['/cadastro/confirmacao']);
    } else {
      this.dadosPessoaisForm.markAllAsTouched();
    }
  }

  private salvarDadosAtuais(): void {
    const formvalue = this.dadosPessoaisForm.value;
    this.cadastroService.updateCadastroData({
      nomeCompleto: formvalue.nomeCompleto,
      estado: formvalue.estado,
      cidade: formvalue.cidade,
      email: formvalue.email,
      senha: formvalue.senha
    });
  }

  private carregarEstados(): void {
    this.estado$ = this.ibgeService.getEstados();
  }

  private configurarListnerEstado(): void {
    const estadoControl = this.dadosPessoaisForm.get('estado');

    if (estadoControl) {
      this.cidade$ = estadoControl.valueChanges.pipe(
        startWith(''),
        tap(() => {
          this.resetarCidade();
          this.carregandoCidades$.next(true);
        }),
        switchMap(uf => {
          if (uf) {
            return this.ibgeService.getCidadesPorEstado(uf).pipe(
              tap(() => this.carregandoCidades$.next(false))
            );
          }

          this.carregandoCidades$.next(false);
          return of([]);
        })
      );
    }
    this.dadosPessoaisForm.get('estado')?.valueChanges.subscribe(estadoId => {
      this.dadosPessoaisForm.get('cidade')?.setValue('');
      if (estadoId) {
        this.carregandoCidades$.next(true);
        this.cidade$ = this.ibgeService.getCidadesPorEstado(estadoId);
        this.cidade$.subscribe(() => this.carregandoCidades$.next(false));
      } else {
        this.cidade$ = new Observable<Cidade[]>();
      }
    });
  }

  private resetarCidade(): void {
    this.dadosPessoaisForm.get('cidade')?.setValue('');
  }
}
