
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
    var date: LocalDate? = LocalDate.now()

    @field:NotBlank
    var description: String? = null
}
