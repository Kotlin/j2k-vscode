package org.springframework.samples.petclinic.owner

import java.time.LocalDate
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.samples.petclinic.model.BaseEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import jakarta.validation.constraints.NotBlank

@Entity
@Table(name = "visits")
open class Visit : BaseEntity() {

    @field:Column(name = "visit_date")
    @field:DateTimeFormat(pattern = "yyyy-MM-dd")
    private val date by field

    // How to handle the default constructor? It sets `this.date` to today.
    // But note: we cannot assign to a property from outside without using setters or constructors.

    // Let's keep it as is for now, but then in Step 2 we will refine nullability and mutability.
}